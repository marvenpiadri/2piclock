import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../../core/services/client.service';
import { DocumentParty } from '../../../core/models/document.model';

@Component({
  selector: 'app-client-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-picker.html',
  styleUrl: './client-picker.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientPickerComponent {
  private clientService = inject(ClientService);

  client = input.required<DocumentParty>();
  clientChange = output<DocumentParty>();
  clientIdChange = output<string | undefined>();

  readonly savedClients = this.clientService.clients;

  onFieldChange(field: keyof DocumentParty, value: string): void {
    const updated: DocumentParty = {
      ...this.client(),
      [field]: value
    };
    this.clientChange.emit(updated);
  }

  onSelectExisting(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const clientId = select.value;
    if (!clientId) {
      this.clientIdChange.emit(undefined);
      return;
    }

    const found = this.savedClients().find(c => c.id === clientId);
    if (found) {
      const party: DocumentParty = {
        name: found.name,
        legalName: found.companyName,
        email: found.email,
        phone: found.phone,
        address: found.address,
        city: found.city,
        postalCode: found.postalCode,
        country: found.country,
        taxId: found.taxId
      };
      this.clientChange.emit(party);
      this.clientIdChange.emit(found.id);
    }
  }
}
