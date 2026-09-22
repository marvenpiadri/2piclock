import { Injectable, signal } from '@angular/core';
import { db, seedInitialDataIfNeeded } from '../db/app-database';
import { Client } from '../models/client.model';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  readonly clients = signal<Client[]>([]);

  constructor() {
    this.loadClients();
  }

  async loadClients(): Promise<Client[]> {
    await seedInitialDataIfNeeded();
    const list = await db.clients.orderBy('name').toArray();
    this.clients.set(list);
    return list;
  }

  async getClientById(id: string): Promise<Client | undefined> {
    return await db.clients.get(id);
  }

  async getClientBySlug(slug: string): Promise<Client | undefined> {
    const cleaned = slug.trim().toLowerCase();
    const all = await db.clients.toArray();
    return all.find(c => c.slug.toLowerCase() === cleaned || c.id === slug);
  }

  async saveClient(client: Partial<Client>): Promise<Client> {
    const name = (client.name || 'New Client').trim();
    const slug = (client.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    const now = new Date().toISOString();

    const fullClient: Client = {
      id: client.id || `client-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      slug,
      name,
      companyName: client.companyName || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      postalCode: client.postalCode || '',
      country: client.country || '',
      taxId: client.taxId || '',
      defaultCurrency: client.defaultCurrency || 'USD',
      defaultTaxRate: client.defaultTaxRate ?? 10,
      notes: client.notes || '',
      createdAt: client.createdAt || now,
      updatedAt: now
    };

    await db.clients.put(fullClient);
    await this.loadClients();
    return fullClient;
  }

  async deleteClient(id: string): Promise<void> {
    await db.clients.delete(id);
    await this.loadClients();
  }
}
