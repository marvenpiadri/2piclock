import {
  CelestialState,
  LunarPosition,
  MoonPhaseName,
  SolarEvents,
  SolarPosition,
  TwilightState
} from '../models/celestial.model';

const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;

/**
 * Normalizes an angle in degrees to [0, 360)
 */
function normalizeDeg(deg: number): number {
  const mod = deg % 360;
  return mod < 0 ? mod + 360 : mod;
}

/**
 * Calculates Julian Day Number from a UTC Date object
 */
export function getJulianDate(date: Date): number {
  const time = date.getTime();
  return time / 86400000 + 2440587.5;
}

/**
 * Calculates Julian Centuries since J2000.0
 */
export function getJulianCenturies(julianDay: number): number {
  return (julianDay - 2451545.0) / 36525.0;
}

/**
 * Computes Greenwich Mean Sidereal Time in degrees [0, 360)
 */
export function getGMST(jd: number, t: number): number {
  const gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + t * t * (0.000387933 - t / 38710000);
  return normalizeDeg(gmst);
}

/**
 * Calculates high-precision solar coordinates (NOAA / Meeus algorithm)
 */
export function calculateSolarPosition(
  date: Date,
  lat: number,
  lng: number
): SolarPosition {
  const jd = getJulianDate(date);
  const t = getJulianCenturies(jd);

  // Geometric Mean Longitude (deg)
  const L0 = normalizeDeg(280.46646 + t * (36000.76983 + t * 0.0003032));

  // Mean Anomaly (deg)
  const M = normalizeDeg(357.52911 + t * (35999.05029 - 0.0001537 * t));
  const Mrad = M * DEG2RAD;

  // Eccentricity of Earth orbit
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);

  // Sun Equation of Center
  const C =
    Math.sin(Mrad) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * Mrad) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * Mrad) * 0.000289;

  // Sun True Longitude & True Anomaly
  const trueLong = L0 + C;
  const trueAnomaly = M + C;

  // Sun Radius Vector (in AU)
  const distanceAU = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(trueAnomaly * DEG2RAD));

  // Sun Apparent Longitude (deg)
  const omega = 125.04 - 1934.136 * t;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * DEG2RAD);
  const lambdaRad = lambda * DEG2RAD;

  // Obliquity of Ecliptic (deg)
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * DEG2RAD);
  const epsRad = eps * DEG2RAD;

  // Right Ascension & Declination
  const sinAlpha = Math.cos(epsRad) * Math.sin(lambdaRad);
  const cosAlpha = Math.cos(lambdaRad);
  const rightAscensionDeg = normalizeDeg(Math.atan2(sinAlpha, cosAlpha) * RAD2DEG);
  const declinationRad = Math.asin(Math.sin(epsRad) * Math.sin(lambdaRad));
  const declinationDeg = declinationRad * RAD2DEG;

  // Equation of Time (minutes)
  const y = Math.tan(epsRad / 2) ** 2;
  const L0rad = L0 * DEG2RAD;
  const eTimeRad =
    y * Math.sin(2 * L0rad) -
    2 * e * Math.sin(Mrad) +
    4 * e * y * Math.sin(Mrad) * Math.cos(2 * L0rad) -
    0.5 * y * y * Math.sin(4 * L0rad) -
    1.25 * e * e * Math.sin(2 * Mrad);
  const equationOfTimeMinutes = 4 * eTimeRad * RAD2DEG;

  // Sidereal Time & Local Hour Angle
  const gmst = getGMST(jd, t);
  const lst = normalizeDeg(gmst + lng);
  let hourAngle = normalizeDeg(lst - rightAscensionDeg);
  if (hourAngle > 180) hourAngle -= 360;
  const hourAngleRad = hourAngle * DEG2RAD;

  // Horizontal Coordinates (Altitude & Azimuth)
  const latRad = lat * DEG2RAD;
  const sinAlt = Math.sin(latRad) * Math.sin(declinationRad) + Math.cos(latRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  const rawAltRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  let altitudeDeg = rawAltRad * RAD2DEG;

  // Atmospheric Refraction Correction
  if (altitudeDeg > -1) {
    const r = 1.02 / Math.tan((altitudeDeg + 10.3 / (altitudeDeg + 5.11)) * DEG2RAD); // arcminutes
    altitudeDeg += r / 60;
  }

  // Azimuth calculation
  const cosAz = (Math.sin(declinationRad) - Math.sin(latRad) * Math.sin(rawAltRad)) /
                (Math.cos(latRad) * Math.cos(rawAltRad));
  const clampedCosAz = Math.max(-1, Math.min(1, cosAz));
  let azimuthDeg = Math.acos(clampedCosAz) * RAD2DEG;
  if (Math.sin(hourAngleRad) > 0) {
    azimuthDeg = 360 - azimuthDeg;
  }

  const zenithDeg = 90 - altitudeDeg;

  return {
    altitudeDeg,
    azimuthDeg: normalizeDeg(azimuthDeg),
    zenithDeg,
    declinationDeg,
    rightAscensionDeg,
    equationOfTimeMinutes,
    isAboveHorizon: altitudeDeg > -0.833,
    distanceAU
  };
}

/**
 * Calculates Solar Events (Sunrise, Sunset, Twilight transitions, Solar Noon)
 */
export function calculateSolarEvents(
  date: Date,
  lat: number,
  lng: number
): SolarEvents {
  const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
  const jd0 = getJulianDate(startOfDay);
  const t0 = getJulianCenturies(jd0);

  // Approximate Solar Noon
  const L0 = normalizeDeg(280.46646 + t0 * 36000.76983);
  const M = normalizeDeg(357.52911 + t0 * 35999.05029);
  const eps = 23.439291 - t0 * 0.0130042;
  const epsRad = eps * DEG2RAD;
  const y = Math.tan(epsRad / 2) ** 2;
  const e = 0.016708634;
  const eTimeMin = 4 * RAD2DEG * (
    y * Math.sin(2 * L0 * DEG2RAD) -
    2 * e * Math.sin(M * DEG2RAD)
  );

  // Solar noon in UTC minutes from midnight
  const solarNoonMinutes = 720 - 4 * lng - eTimeMin;
  const noonDate = new Date(startOfDay.getTime() + solarNoonMinutes * 60000);

  // Sun declination at noon
  const solarPosAtNoon = calculateSolarPosition(noonDate, lat, lng);
  const declRad = solarPosAtNoon.declinationDeg * DEG2RAD;
  const latRad = lat * DEG2RAD;

  const calculateEventTimes = (zenithDeg: number): { rise: Date | null; set: Date | null } => {
    const cosH0 = (Math.cos(zenithDeg * DEG2RAD) - Math.sin(latRad) * Math.sin(declRad)) /
                  (Math.cos(latRad) * Math.cos(declRad));

    if (cosH0 > 1) {
      // Sun never reaches this zenith (polar night for sunrise)
      return { rise: null, set: null };
    }
    if (cosH0 < -1) {
      // Sun never drops below this zenith (polar day / midnight sun)
      return { rise: null, set: null };
    }

    const H0deg = Math.acos(cosH0) * RAD2DEG;
    const deltaMinutes = H0deg * 4;

    const riseMinutes = solarNoonMinutes - deltaMinutes;
    const setMinutes = solarNoonMinutes + deltaMinutes;

    return {
      rise: new Date(startOfDay.getTime() + riseMinutes * 60000),
      set: new Date(startOfDay.getTime() + setMinutes * 60000)
    };
  };

  const sunTimes = calculateEventTimes(90.833);       // Official horizon (90°50')
  const civilTimes = calculateEventTimes(96.0);       // Civil twilight (6° below)
  const nauticalTimes = calculateEventTimes(102.0);   // Nautical twilight (12° below)
  const astroTimes = calculateEventTimes(108.0);      // Astronomical twilight (18° below)
  const goldenHourTimes = calculateEventTimes(84.0);  // Golden hour (6° above)
  const blueHourTimes = calculateEventTimes(98.0);    // Blue hour (8° below)

  const cosH0Sun = (Math.cos(90.833 * DEG2RAD) - Math.sin(latRad) * Math.sin(declRad)) /
                   (Math.cos(latRad) * Math.cos(declRad));

  const isPolarDay = cosH0Sun < -1;
  const isPolarNight = cosH0Sun > 1;

  let dayLengthMinutes = 0;
  if (isPolarDay) {
    dayLengthMinutes = 1440;
  } else if (isPolarNight) {
    dayLengthMinutes = 0;
  } else if (sunTimes.rise && sunTimes.set) {
    dayLengthMinutes = (sunTimes.set.getTime() - sunTimes.rise.getTime()) / 60000;
  }

  return {
    astronomicalDawn: astroTimes.rise,
    nauticalDawn: nauticalTimes.rise,
    civilDawn: civilTimes.rise,
    sunrise: sunTimes.rise,
    solarNoon: noonDate,
    sunset: sunTimes.set,
    civilDusk: civilTimes.set,
    nauticalDusk: nauticalTimes.set,
    astronomicalDusk: astroTimes.set,
    goldenHourMorning: {
      start: sunTimes.rise,
      end: goldenHourTimes.rise
    },
    goldenHourEvening: {
      start: goldenHourTimes.set,
      end: sunTimes.set
    },
    blueHourMorning: {
      start: blueHourTimes.rise,
      end: civilTimes.rise
    },
    blueHourEvening: {
      start: civilTimes.set,
      end: blueHourTimes.set
    },
    dayLengthMinutes: Math.max(0, dayLengthMinutes),
    isPolarDay,
    isPolarNight
  };
}

/**
 * Calculates high-precision Lunar coordinates and phase geometry (Meeus algorithm)
 */
export function calculateLunarPosition(
  date: Date,
  lat: number,
  lng: number,
  sunPos: SolarPosition
): LunarPosition {
  const jd = getJulianDate(date);
  const t = getJulianCenturies(jd);

  // Fundamental arguments of Moon's motion (deg)
  const Lp = normalizeDeg(218.3164477 + 481267.88123421 * t); // Mean Longitude
  const D  = normalizeDeg(297.8501921 + 445267.1114034 * t);  // Mean Elongation
  const M  = normalizeDeg(357.5291092 + 35999.0502909 * t);   // Sun Mean Anomaly
  const Mp = normalizeDeg(134.9633964 + 477198.8675055 * t);  // Moon Mean Anomaly
  const F  = normalizeDeg(93.2720950 + 483202.0175233 * t);   // Moon Argument of Latitude

  const Drad = D * DEG2RAD;
  const Mrad = M * DEG2RAD;
  const Mprad = Mp * DEG2RAD;
  const Frad = F * DEG2RAD;

  // Periodic terms for Longitude (deg)
  const deltaL =
    6.288774 * Math.sin(Mprad) +
    1.274027 * Math.sin(2 * Drad - Mprad) +
    0.658314 * Math.sin(2 * Drad) +
    0.213618 * Math.sin(2 * Mprad) -
    0.185116 * Math.sin(Mrad) -
    0.114332 * Math.sin(2 * Frad) +
    0.058793 * Math.sin(2 * Drad - 2 * Mprad) +
    0.057066 * Math.sin(2 * Drad - Mrad - Mprad) +
    0.053322 * Math.sin(2 * Drad + Mprad) +
    0.045758 * Math.sin(2 * Drad - Mrad);

  // Periodic terms for Latitude (deg)
  const deltaB =
    5.128122 * Math.sin(Frad) +
    0.280606 * Math.sin(Mprad + Frad) +
    0.277693 * Math.sin(Mprad - Frad) +
    0.173238 * Math.sin(2 * Drad - Frad) +
    0.055413 * Math.sin(2 * Drad - Mprad + Frad) +
    0.046271 * Math.sin(2 * Drad - Mprad - Frad);

  // Periodic terms for Earth-Moon Distance (km)
  const deltaDistance =
    -20905.355 * Math.cos(Mprad) -
    3699.111 * Math.cos(2 * Drad - Mprad) -
    2955.968 * Math.cos(2 * Drad) -
    569.925 * Math.cos(2 * Mprad);
  const distanceKm = 385000.56 + deltaDistance;

  // Ecliptic Longitude and Latitude
  const lambdaMoonDeg = normalizeDeg(Lp + deltaL);
  const betaMoonDeg = deltaB;
  const lambdaMoonRad = lambdaMoonDeg * DEG2RAD;
  const betaMoonRad = betaMoonDeg * DEG2RAD;

  // Obliquity of Ecliptic
  const eps = 23.439291 - t * 0.0130042;
  const epsRad = eps * DEG2RAD;

  // Equatorial Coordinates (Right Ascension and Declination)
  const sinAlphaM = Math.sin(lambdaMoonRad) * Math.cos(epsRad) - Math.tan(betaMoonRad) * Math.sin(epsRad);
  const cosAlphaM = Math.cos(lambdaMoonRad);
  const raMoonDeg = normalizeDeg(Math.atan2(sinAlphaM, cosAlphaM) * RAD2DEG);

  const sinDeltaM = Math.sin(betaMoonRad) * Math.cos(epsRad) + Math.cos(betaMoonRad) * Math.sin(epsRad) * Math.sin(lambdaMoonRad);
  const declMoonRad = Math.asin(Math.max(-1, Math.min(1, sinDeltaM)));
  const _declMoonDeg = declMoonRad * RAD2DEG;
  void _declMoonDeg;

  // Sidereal Time & Local Hour Angle
  const gmst = getGMST(jd, t);
  const lst = normalizeDeg(gmst + lng);
  let hourAngle = normalizeDeg(lst - raMoonDeg);
  if (hourAngle > 180) hourAngle -= 360;
  const hourAngleRad = hourAngle * DEG2RAD;

  // Topocentric Altitude and Azimuth
  const latRad = lat * DEG2RAD;
  const sinAltM = Math.sin(latRad) * Math.sin(declMoonRad) + Math.cos(latRad) * Math.cos(declMoonRad) * Math.cos(hourAngleRad);
  const rawAltRad = Math.asin(Math.max(-1, Math.min(1, sinAltM)));
  let altitudeDeg = rawAltRad * RAD2DEG;

  // Lunar parallax correction (~0.95° maximum at horizon)
  const piRad = Math.asin(6378.137 / distanceKm);
  const parallaxDeg = piRad * RAD2DEG * Math.cos(rawAltRad);
  altitudeDeg -= parallaxDeg;

  // Atmospheric Refraction
  if (altitudeDeg > -1) {
    const r = 1.02 / Math.tan((altitudeDeg + 10.3 / (altitudeDeg + 5.11)) * DEG2RAD);
    altitudeDeg += r / 60;
  }

  const cosAzM = (Math.sin(declMoonRad) - Math.sin(latRad) * Math.sin(rawAltRad)) /
                 (Math.cos(latRad) * Math.cos(rawAltRad));
  let azimuthDeg = Math.acos(Math.max(-1, Math.min(1, cosAzM))) * RAD2DEG;
  if (Math.sin(hourAngleRad) > 0) {
    azimuthDeg = 360 - azimuthDeg;
  }

  // Lunar Phase Angle (i) & Illuminated Fraction (k)
  // cos(i) = -cos(lambdaMoon - lambdaSun) * cos(betaMoon)
  const sunLambda = sunPos.rightAscensionDeg; // approximate ecliptic long
  const elongRad = Math.abs(lambdaMoonRad - (sunLambda * DEG2RAD));
  const cosPhaseAngle = -Math.cos(elongRad) * Math.cos(betaMoonRad);
  const phaseAngleDeg = Math.acos(Math.max(-1, Math.min(1, cosPhaseAngle))) * RAD2DEG;
  const illuminationFraction = (1 + Math.cos(phaseAngleDeg * DEG2RAD)) / 2;

  // Moon Age (days in 29.530589d synodic month)
  const synodicMonthDays = 29.530588853;
  const ageDays = (normalizeDeg(D) / 360) * synodicMonthDays;

  // Moon Phase Name Assignment
  let phaseName: MoonPhaseName;
  const normAge = normalizeDeg(D); // elongation: 0 = new, 90 = first quarter, 180 = full, 270 = third quarter

  if (normAge >= 350 || normAge < 10) {
    phaseName = 'New Moon';
  } else if (normAge >= 10 && normAge < 80) {
    phaseName = 'Waxing Crescent';
  } else if (normAge >= 80 && normAge < 100) {
    phaseName = 'First Quarter';
  } else if (normAge >= 100 && normAge < 170) {
    phaseName = 'Waxing Gibbous';
  } else if (normAge >= 170 && normAge < 190) {
    phaseName = 'Full Moon';
  } else if (normAge >= 190 && normAge < 260) {
    phaseName = 'Waning Gibbous';
  } else if (normAge >= 260 && normAge < 280) {
    phaseName = 'Third Quarter';
  } else {
    phaseName = 'Waning Crescent';
  }

  // Position Angle of Bright Limb (chi): Tilt orientation of illuminated crescent
  const sunDecRad = sunPos.declinationDeg * DEG2RAD;
  const deltaRA = (sunPos.rightAscensionDeg - raMoonDeg) * DEG2RAD;
  const yLimb = Math.cos(sunDecRad) * Math.sin(deltaRA);
  const xLimb = Math.sin(sunDecRad) * Math.cos(declMoonRad) - Math.cos(sunDecRad) * Math.sin(declMoonRad) * Math.cos(deltaRA);
  const brightLimbAngleDeg = normalizeDeg(Math.atan2(yLimb, xLimb) * RAD2DEG);

  return {
    altitudeDeg,
    azimuthDeg: normalizeDeg(azimuthDeg),
    phaseName,
    illuminationFraction: Math.max(0, Math.min(1, illuminationFraction)),
    phaseAngleDeg,
    ageDays,
    brightLimbAngleDeg,
    parallaxDeg,
    distanceKm,
    isAboveHorizon: altitudeDeg > -0.5
  };
}

/**
 * Derives comprehensive celestial state for a specific moment and location
 */
export function getCelestialState(
  date: Date,
  lat: number,
  lng: number,
  timezone: string
): CelestialState {
  const sun = calculateSolarPosition(date, lat, lng);
  const solarEvents = calculateSolarEvents(date, lat, lng);
  const moon = calculateLunarPosition(date, lat, lng, sun);

  // Determine Twilight Phase based on solar altitude
  let twilightState: TwilightState;
  const alt = sun.altitudeDeg;

  if (alt > 6) {
    twilightState = 'day';
  } else if (alt > 0) {
    twilightState = 'golden_hour';
  } else if (alt > -6) {
    twilightState = 'civil_twilight';
  } else if (alt > -12) {
    twilightState = 'nautical_twilight';
  } else if (alt > -18) {
    twilightState = 'astronomical_twilight';
  } else {
    twilightState = 'night';
  }

  // Star visibility fraction: 0.0 at altitude >= 0°, ramping to 1.0 at -18°
  let starVisibilityFraction = 0;
  if (alt < -4) {
    starVisibilityFraction = Math.min(1, Math.max(0, (-alt - 4) / 14));
  }

  // Atmospheric scattering intensity: 1.0 at high noon down to 0.0 in deep night
  const atmosphericScatteringIntensity = Math.min(1, Math.max(0, (alt + 12) / 30));

  // Determine daylight progress (0 to 1 across 24 hours)
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const daylightProgress = (hours / 24) % 1;

  // Formatted local & UTC strings
  let localTimeString = '';
  let utcTimeString = '';
  try {
    localTimeString = date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch {
    localTimeString = date.toTimeString().slice(0, 8);
  }

  utcTimeString = date.toISOString().slice(11, 19) + ' UTC';

  // Day of year and season calculation
  const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = date.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / 86400000) + 1;

  const month = date.getUTCMonth(); // 0 to 11
  let season: 'spring' | 'summer' | 'autumn' | 'winter' = 'spring';
  const isNorthern = lat >= 0;

  if (month >= 2 && month <= 4) {
    season = isNorthern ? 'spring' : 'autumn';
  } else if (month >= 5 && month <= 7) {
    season = isNorthern ? 'summer' : 'winter';
  } else if (month >= 8 && month <= 10) {
    season = isNorthern ? 'autumn' : 'spring';
  } else {
    season = isNorthern ? 'winter' : 'summer';
  }

  // Solar Hour Angle relative to solar noon
  const noonTime = solarEvents.solarNoon ? solarEvents.solarNoon.getTime() : date.getTime();
  const diffFromNoonMs = date.getTime() - noonTime;
  const solarHourAngleDeg = (diffFromNoonMs / 86400000) * 360;

  return {
    timestamp: date,
    localTimeString,
    utcTimeString,
    dayOfYear,
    season,
    twilightState,
    daylightProgress,
    sun,
    solarEvents,
    moon,
    starVisibilityFraction,
    atmosphericScatteringIntensity,
    solarHourAngleDeg
  };
}

/**
 * Computes 24-hour solar elevation curve (for ephemeris chart)
 */
export function get24HourSolarCurve(
  date: Date,
  lat: number,
  lng: number,
  timezone: string
): { timeString: string; altitude: number; isNight: boolean; hour: number }[] {
  const points: { timeString: string; altitude: number; isNight: boolean; hour: number }[] = [];
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));

  for (let i = 0; i <= 24; i += 0.5) {
    const sampleDate = new Date(start.getTime() + i * 3600000);
    const sunPos = calculateSolarPosition(sampleDate, lat, lng);
    let timeLabel = '';
    try {
      timeLabel = sampleDate.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      timeLabel = `${Math.floor(i).toString().padStart(2, '0')}:${(i % 1 === 0.5 ? '30' : '00')}`;
    }

    points.push({
      timeString: timeLabel,
      altitude: Math.round(sunPos.altitudeDeg * 10) / 10,
      isNight: sunPos.altitudeDeg <= 0,
      hour: i
    });
  }

  return points;
}
