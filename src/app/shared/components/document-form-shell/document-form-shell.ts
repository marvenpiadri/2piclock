import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BusinessDocument, DocumentLineItem, DocumentParty, LineLayoutMode } from '../../../core/models/document.model';
import { DocumentTypeConfig } from '../../../core/models/document-type-config.model';
import { CurrencyService } from '../../../core/services/currency.service';
import { CalculationService } from '../../../core/services/calculation.service';
import { LineItemsTableComponent } from '../line-items-table/line-items-table';
import { ClientPickerComponent } from '../client-picker/client-picker';

@Component({
  selector: 'app-document-form-shell',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LineItemsTableComponent,
    ClientPickerComponent
  ],
  templateUrl: './document-form-shell.html',
  styleUrl: './document-form-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentFormShellComponent {
  private router = inject(Router);
  private currencyService = inject(CurrencyService);
  private calculationService = inject(CalculationService);

  // Inputs
  document = input.required<BusinessDocument>();
  config = input.required<DocumentTypeConfig>();
  isNew = input<boolean>(false);

  // Outputs
  save = output<BusinessDocument>();
  saveAndPreview = output<BusinessDocument>();

  readonly availableCurrencies = this.currencyService.CURRENCIES;

  currencySymbol = computed(() => {
    return this.currencyService.getSymbol(this.document().currency);
  });

  // Calculation summaries live
  totals = computed(() => {
    const doc = this.document();
    return this.calculationService.calculateDocumentTotals(
      doc.items,
      doc.taxRate,
      doc.discountAmount,
      doc.shippingAmount,
      doc.depositPaid
    );
  });

  onHeaderFieldChange(field: keyof BusinessDocument, value: any): void {
    const updated: BusinessDocument = {
      ...this.document(),
      [field]: value
    };
    this.save.emit(updated);
  }

  onClientChange(client: DocumentParty): void {
    const updated: BusinessDocument = {
      ...this.document(),
      client
    };
    this.save.emit(updated);
  }

  onClientIdChange(clientId: string | undefined): void {
    const updated: BusinessDocument = {
      ...this.document(),
      clientId
    };
    this.save.emit(updated);
  }

  onItemsChange(items: DocumentLineItem[]): void {
    const updated: BusinessDocument = {
      ...this.document(),
      items
    };
    this.save.emit(updated);
  }

  onLineLayoutModeChange(mode: LineLayoutMode): void {
    const updated: BusinessDocument = {
      ...this.document(),
      lineLayoutMode: mode
    };
    this.save.emit(updated);
  }

  onTotalsModifierChange(field: 'taxRate' | 'discountAmount' | 'shippingAmount' | 'depositPaid', value: any): void {
    const num = Math.max(0, Number(value) || 0);
    const updated: BusinessDocument = {
      ...this.document(),
      [field]: num
    };
    this.save.emit(updated);
  }

  triggerSave(): void {
    this.save.emit(this.document());
  }

  triggerSaveAndPreview(): void {
    this.saveAndPreview.emit(this.document());
  }
}
