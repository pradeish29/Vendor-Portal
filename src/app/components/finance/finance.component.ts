import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTabsModule, MatTabChangeEvent } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Simplified frontend interfaces
export interface InvoiceData {
  invoiceNo: string;
  amount: number;
  billingDate: string;
  currency: string;
  fiscalYear: string;
}

export interface PaymentData {
  documentNo: string;
  postingDate: string;
  entryDate: string;
  amount: number;
  currency: string;
  dueDate: string;
  aging: number;
  status: string;
}

export interface CreditMemoData {
  memoNo: string;
  postingDate: string;
  entryDate: string;
  amount: number;
  currency: string;
  companyCode: string;
  type: string;
}

export interface DebitMemoData {
  memoNo: string;
  postingDate: string;
  entryDate: string;
  amount: number;
  currency: string;
  companyCode: string;
  type: string;
}

@Component({
  selector: 'app-finance',
  templateUrl: './finance.component.html',
  styleUrls: ['./finance.component.css'],
  standalone: true,
  imports: [
    SidebarComponent, 
    CommonModule, 
    HttpClientModule,
    MatTabsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    DatePipe,
    CurrencyPipe
  ]
})
export class FinanceComponent implements OnInit, AfterViewInit {

  // Table data sources
  invoiceDataSource = new MatTableDataSource<InvoiceData>([]);
  paymentDataSource = new MatTableDataSource<PaymentData>([]);
  creditDataSource = new MatTableDataSource<CreditMemoData>([]);
  debitDataSource = new MatTableDataSource<DebitMemoData>([]);

  // Table column definitions - UPDATED (removed status from invoice and memos)
  displayedColumnsInvoice: string[] = ['invoiceNo', 'amount', 'billingDate', 'currency', 'fiscalYear', 'actions'];
  displayedColumnsPayment: string[] = ['documentNo', 'postingDate', 'amount', 'currency', 'dueDate', 'aging', 'status'];
  displayedColumnsCredit: string[] = ['memoNo', 'postingDate', 'amount', 'currency', 'companyCode', 'type'];
  displayedColumnsDebit: string[] = ['memoNo', 'postingDate', 'amount', 'currency', 'companyCode', 'type'];

  // ViewChild references for pagination and sorting
  @ViewChild('invoicePaginator') invoicePaginator!: MatPaginator;
  @ViewChild('invoiceSort') invoiceSort!: MatSort;
  @ViewChild('paymentPaginator') paymentPaginator!: MatPaginator;
  @ViewChild('paymentSort') paymentSort!: MatSort;
  @ViewChild('creditPaginator') creditPaginator!: MatPaginator;
  @ViewChild('creditSort') creditSort!: MatSort;
  @ViewChild('debitPaginator') debitPaginator!: MatPaginator;
  @ViewChild('debitSort') debitSort!: MatSort;

  // Loading states
  isLoadingInvoice: boolean = false;
  isLoadingPayment: boolean = false;
  isLoadingCredit: boolean = false;
  isLoadingDebit: boolean = false;

  // Current vendor ID
  private currentVendorId: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const vendorId = localStorage.getItem('vendorId');
    
    if (!vendorId) {
      console.error('No vendorId found in localStorage');
      return;
    }

    this.currentVendorId = vendorId;
    console.log('Loading finance data for vendor:', vendorId);
    
    // Load all data
    this.loadAllData();
  }

  ngAfterViewInit(): void {
    // Setup tables after view initialization
    setTimeout(() => {
      this.setupAllTables();
    }, 100);
  }

  private loadAllData(): void {
    if (!this.currentVendorId) return;
    
    this.fetchInvoiceData(this.currentVendorId);
    this.fetchPaymentData(this.currentVendorId);
    this.fetchMemoData(this.currentVendorId);
  }

  private setupAllTables(): void {
    // Setup Invoice table
    if (this.invoicePaginator && this.invoiceSort) {
      this.invoiceDataSource.paginator = this.invoicePaginator;
      this.invoiceDataSource.sort = this.invoiceSort;
    }

    // Setup Payment table  
    if (this.paymentPaginator && this.paymentSort) {
      this.paymentDataSource.paginator = this.paymentPaginator;
      this.paymentDataSource.sort = this.paymentSort;
    }

    // Setup Credit table
    if (this.creditPaginator && this.creditSort) {
      this.creditDataSource.paginator = this.creditPaginator;
      this.creditDataSource.sort = this.creditSort;
    }

    // Setup Debit table
    if (this.debitPaginator && this.debitSort) {
      this.debitDataSource.paginator = this.debitPaginator;
      this.debitDataSource.sort = this.debitSort;
    }

    // Setup filter predicates - UPDATED (removed status from invoice and memos)
    this.setupFilterPredicates();
  }

  private setupFilterPredicates(): void {
    this.invoiceDataSource.filterPredicate = (data: InvoiceData, filter: string) => {
      const searchString = `${data.invoiceNo} ${data.currency} ${data.fiscalYear}`.toLowerCase();
      return searchString.includes(filter);
    };

    this.paymentDataSource.filterPredicate = (data: PaymentData, filter: string) => {
      const searchString = `${data.documentNo} ${data.status} ${data.currency}`.toLowerCase();
      return searchString.includes(filter);
    };

    this.creditDataSource.filterPredicate = (data: CreditMemoData, filter: string) => {
      const searchString = `${data.memoNo} ${data.type} ${data.companyCode}`.toLowerCase();
      return searchString.includes(filter);
    };

    this.debitDataSource.filterPredicate = (data: DebitMemoData, filter: string) => {
      const searchString = `${data.memoNo} ${data.type} ${data.companyCode}`.toLowerCase();
      return searchString.includes(filter);
    };
  }

  // Fetch Invoice data - UPDATED (removed random status)
  fetchInvoiceData(vendorId: string): void {
    this.isLoadingInvoice = true;
    console.log('Fetching invoice data for vendor:', vendorId);
    
    this.http.post<any>('http://localhost:3000/vendorinvoicelist', { vendorId }).subscribe({
      next: (response) => {
        console.log('Invoice API Response:', response);
        
        try {
          // Handle different response formats
          let jsonData = response;
          if (response && response.data) {
            jsonData = response.data;
          }
          
          // Ensure we have an array
          const dataArray = Array.isArray(jsonData) ? jsonData : (jsonData ? [jsonData] : []);
          console.log('Processing invoice data array:', dataArray);
          
          if (dataArray.length === 0) {
            console.warn('No invoice data received');
            this.invoiceDataSource.data = [];
            this.isLoadingInvoice = false;
            return;
          }
          
          const processedData: InvoiceData[] = dataArray.map((item: any, index: number) => {
            console.log(`Processing invoice item ${index}:`, item);
            
            return {
              invoiceNo: this.safeStringValue(item.belnrD || item.belnr_d || item.invoiceNo || item.BELNR_D),
              amount: this.safeNumberValue(item.wrbtr || item.amount || item.WRBTR),
              billingDate: this.formatSAPDate(item.budat || item.billingDate || item.BUDAT),
              currency: this.safeStringValue(item.waers || item.currency || item.WAERS) || 'INR',
              fiscalYear: this.safeStringValue(item.gjahr || item.fiscalYear || item.GJAHR)
            };
          });

          console.log('Processed invoice data:', processedData);
          this.invoiceDataSource.data = processedData;
          
          // Re-setup table after data update
          setTimeout(() => {
            this.setupInvoiceTable();
          }, 100);
          
        } catch (error) {
          console.error('Error processing invoice data:', error);
          this.invoiceDataSource.data = [];
        }
        
        this.isLoadingInvoice = false;
      },
      error: (err) => {
        console.error('Error fetching invoice data:', err);
        this.invoiceDataSource.data = [];
        this.isLoadingInvoice = false;
      }
    });
  }

  // Fetch Payment data - FIXED
  fetchPaymentData(vendorId: string): void {
    this.isLoadingPayment = true;
    console.log('Fetching payment data for vendor:', vendorId);
    
    this.http.post<any>('http://localhost:3000/vendorpay', { vendorId }).subscribe({
      next: (response) => {
        console.log('Payment API Response:', response);
        
        try {
          let jsonData = response;
          if (response && response.data) {
            jsonData = response.data;
          }
          
          const dataArray = Array.isArray(jsonData) ? jsonData : (jsonData ? [jsonData] : []);
          console.log('Processing payment data array:', dataArray);
          
          if (dataArray.length === 0) {
            console.warn('No payment data received');
            this.paymentDataSource.data = [];
            this.isLoadingPayment = false;
            return;
          }
          
          const processedData: PaymentData[] = dataArray.map((item: any, index: number) => {
            console.log(`Processing payment item ${index}:`, item);
            
            const aging = this.safeNumberValue(item.aging || item.AGING);
            
            return {
              documentNo: this.safeStringValue(item.belnrD || item.belnr_d || item.documentNo || item.BELNR_D),
              postingDate: this.formatSAPDate(item.budat || item.postingDate || item.BUDAT),
              entryDate: this.formatSAPDate(item.cpudt || item.entryDate || item.CPUDT),
              amount: this.safeNumberValue(item.dmbtr || item.amount || item.DMBTR),
              currency: this.safeStringValue(item.waers || item.currency || item.WAERS) || 'INR',
              dueDate: this.formatSAPDate(item.dzfbdt || item.dueDate || item.DZFBDT),
              aging: aging,
              status: this.getPaymentStatus(aging)
            };
          });

          console.log('Processed payment data:', processedData);
          this.paymentDataSource.data = processedData;
          
          setTimeout(() => {
            this.setupPaymentTable();
          }, 100);
          
        } catch (error) {
          console.error('Error processing payment data:', error);
          this.paymentDataSource.data = [];
        }
        
        this.isLoadingPayment = false;
      },
      error: (err) => {
        console.error('Error fetching payment data:', err);
        this.paymentDataSource.data = [];
        this.isLoadingPayment = false;
      }
    });
  }

  // Fetch Memo data - UPDATED (removed random status)
  fetchMemoData(vendorId: string): void {
    this.isLoadingCredit = true;
    this.isLoadingDebit = true;
    console.log('Fetching memo data for vendor:', vendorId);
    
    this.http.post<any>('http://localhost:3000/vendormemo', { vendorId }).subscribe({
      next: (response) => {
        console.log('Memo API Response:', response);
        
        try {
          let jsonData = response;
          if (response && response.data) {
            jsonData = response.data;
          }
          
          const dataArray = Array.isArray(jsonData) ? jsonData : (jsonData ? [jsonData] : []);
          console.log('Processing memo data array:', dataArray);
          
          const creditMemos: CreditMemoData[] = [];
          const debitMemos: DebitMemoData[] = [];

          dataArray.forEach((item: any, index: number) => {
            console.log(`Processing memo item ${index}:`, item);
            
            const baseData = {
              memoNo: this.safeStringValue(item.belnrD || item.belnr_d || item.memoNo || item.BELNR_D),
              postingDate: this.formatSAPDate(item.budat || item.postingDate || item.BUDAT),
              entryDate: this.formatSAPDate(item.cpudt || item.entryDate || item.CPUDT),
              amount: this.safeNumberValue(item.dmbtr || item.amount || item.DMBTR),
              currency: this.safeStringValue(item.waers || item.currency || item.WAERS) || 'INR',
              companyCode: this.safeStringValue(item.bukrs || item.companyCode || item.BUKRS),
              type: this.safeStringValue(item.blart || item.type || item.BLART)
            };

            // Separate credit and debit based on shkzg indicator
            const indicator = this.safeStringValue(item.shkzg || item.SHKZG);
            if (indicator === 'H' || indicator === 'h') {
              creditMemos.push(baseData);
            } else {
              debitMemos.push(baseData);
            }
          });

          console.log('Processed credit memos:', creditMemos);
          console.log('Processed debit memos:', debitMemos);
          
          this.creditDataSource.data = creditMemos;
          this.debitDataSource.data = debitMemos;
          
          setTimeout(() => {
            this.setupMemoTables();
          }, 100);
          
        } catch (error) {
          console.error('Error processing memo data:', error);
          this.creditDataSource.data = [];
          this.debitDataSource.data = [];
        }
        
        this.isLoadingCredit = false;
        this.isLoadingDebit = false;
      },
      error: (err) => {
        console.error('Error fetching memo data:', err);
        this.creditDataSource.data = [];
        this.debitDataSource.data = [];
        this.isLoadingCredit = false;
        this.isLoadingDebit = false;
      }
    });
  }

  // Helper methods for safe data extraction
  private safeStringValue(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  private safeNumberValue(value: any): number {
    if (value === null || value === undefined) return 0;
    const num = parseFloat(String(value));
    return isNaN(num) ? 0 : num;
  }

  // Setup individual tables - FIXED
  private setupInvoiceTable(): void {
    if (this.invoicePaginator && this.invoiceSort) {
      this.invoiceDataSource.paginator = this.invoicePaginator;
      this.invoiceDataSource.sort = this.invoiceSort;
    }
  }

  private setupPaymentTable(): void {
    if (this.paymentPaginator && this.paymentSort) {
      this.paymentDataSource.paginator = this.paymentPaginator;
      this.paymentDataSource.sort = this.paymentSort;
    }
  }

  private setupMemoTables(): void {
    if (this.creditPaginator && this.creditSort) {
      this.creditDataSource.paginator = this.creditPaginator;
      this.creditDataSource.sort = this.creditSort;
    }
    if (this.debitPaginator && this.debitSort) {
      this.debitDataSource.paginator = this.debitPaginator;
      this.debitDataSource.sort = this.debitSort;
    }
  }

  // Helper method to format SAP dates - IMPROVED
  private formatSAPDate(sapDate: string): string {
    if (!sapDate) return '';
    
    try {
      // Handle /Date(timestamp)/ format from OData
      if (sapDate.includes('/Date(')) {
        const timestamp = sapDate.match(/\d+/)?.[0];
        if (timestamp) {
          const date = new Date(parseInt(timestamp));
          return date.toISOString().split('T')[0];
        }
      }
      
      // Handle YYYYMMDD format
      if (sapDate.length === 8 && /^\d{8}$/.test(sapDate)) {
        const year = sapDate.substring(0, 4);
        const month = sapDate.substring(4, 6);
        const day = sapDate.substring(6, 8);
        return `${year}-${month}-${day}`;
      }
      
      // Handle ISO date format
      if (sapDate.includes('-') || sapDate.includes('/')) {
        const date = new Date(sapDate);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      
      return sapDate;
    } catch (error) {
      console.warn('Error formatting date:', sapDate, error);
      return sapDate;
    }
  }

  // Payment status helper (kept only for payments)
  private getPaymentStatus(aging: number): string {
    if (aging === 0) return 'Current';
    if (aging <= 30) return 'Due Soon';
    if (aging <= 60) return 'Overdue';
    return 'Critical';
  }

  // Filter function for search - FIXED
  applyFilter(event: Event, tableType: string): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    
    switch(tableType) {
      case 'invoice':
        this.invoiceDataSource.filter = filterValue;
        if (this.invoiceDataSource.paginator) {
          this.invoiceDataSource.paginator.firstPage();
        }
        break;
      case 'payment':
        this.paymentDataSource.filter = filterValue;
        if (this.paymentDataSource.paginator) {
          this.paymentDataSource.paginator.firstPage();
        }
        break;
      case 'credit':
        this.creditDataSource.filter = filterValue;
        if (this.creditDataSource.paginator) {
          this.creditDataSource.paginator.firstPage();
        }
        break;
      case 'debit':
        this.debitDataSource.filter = filterValue;
        if (this.debitDataSource.paginator) {
          this.debitDataSource.paginator.firstPage();
        }
        break;
    }
  }

  // Handle tab change - FIXED
  onTabChange(event: MatTabChangeEvent): void {
    setTimeout(() => {
      this.setupAllTables();
    }, 200);
  }

  // Stats functions - UPDATED
  getTotalCount(type: string): number {
    switch(type) {
      case 'invoice':
        return this.invoiceDataSource.data.length;
      case 'payment':
        return this.paymentDataSource.data.length;
      case 'credit':
        return this.creditDataSource.data.length;
      case 'debit':
        return this.debitDataSource.data.length;
      default:
        return 0;
    }
  }

  getTotalAmount(type: string): number {
    switch(type) {
      case 'invoice':
        return this.invoiceDataSource.data.reduce((total, invoice) => total + invoice.amount, 0);
      case 'payment':
        return this.paymentDataSource.data.reduce((total, payment) => total + payment.amount, 0);
      case 'credit':
        return this.creditDataSource.data.reduce((total, memo) => total + memo.amount, 0);
      case 'debit':
        return this.debitDataSource.data.reduce((total, memo) => total + memo.amount, 0);
      default:
        return 0;
    }
  }

  getOverdueCount(): number {
    return this.paymentDataSource.data.filter(payment => payment.aging > 30).length;
  }

  // Aging class for styling (only for payments)
  getAgingClass(aging: number): string {
    if (aging === 0) return 'current';
    if (aging <= 30) return 'thirty-days';
    if (aging <= 60) return 'sixty-days';
    if (aging <= 90) return 'ninety-days';
    return 'over-ninety';
  }

  // INVOICE ACTIONS - Using Backend PDF Service
  downloadInvoice(invoice: InvoiceData): void {
    if (!this.currentVendorId || !invoice.invoiceNo) {
      console.error('Missing vendor ID or invoice number');
      alert('Cannot download invoice: Missing required information');
      return;
    }

    console.log('Downloading invoice PDF:', invoice.invoiceNo);
    
    // Show loading state
    const downloadButton = document.querySelector(`[data-invoice="${invoice.invoiceNo}"] .download-btn`) as HTMLButtonElement;
    if (downloadButton) {
      downloadButton.disabled = true;
      // downloadButton.innerHTML = '<mat-icon>hourglass_empty</mat-icon>';
    }
    
    this.http.post('http://localhost:3000/vendorform', {
      vendorId: this.currentVendorId,
      invoiceNumber: invoice.invoiceNo
    }, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      }
    }).subscribe({
      next: (pdfBlob: Blob) => {
        console.log('PDF downloaded successfully');
        
        // Create download link
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice_${invoice.invoiceNo}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        // Reset button
        if (downloadButton) {
          downloadButton.disabled = false;
          downloadButton.innerHTML = '<mat-icon>download</mat-icon>';
        }
      },
      error: (error) => {
        console.error('Error downloading PDF:', error);
        alert('Failed to download invoice PDF. Please try again.');
        
        // Reset button
        if (downloadButton) {
          downloadButton.disabled = false;
          downloadButton.innerHTML = '<mat-icon>download</mat-icon>';
        }
      }
    });
  }

  previewInvoice(invoice: InvoiceData): void {
    if (!this.currentVendorId || !invoice.invoiceNo) {
      console.error('Missing vendor ID or invoice number');
      alert('Cannot preview invoice: Missing required information');
      return;
    }

    console.log('Previewing invoice PDF:', invoice.invoiceNo);
    
    // Show loading state
    const previewButton = document.querySelector(`[data-invoice="${invoice.invoiceNo}"] .preview-btn`) as HTMLButtonElement;
    if (previewButton) {
      previewButton.disabled = true;
      previewButton.innerHTML = '<mat-icon>hourglass_empty</mat-icon>';
    }
    
    this.http.post('http://localhost:3000/vendorform', {
      vendorId: this.currentVendorId,
      invoiceNumber: invoice.invoiceNo
    }, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      }
    }).subscribe({
      next: (pdfBlob: Blob) => {
        console.log('PDF loaded for preview');
        
        // Create blob URL and open in new tab
        const url = window.URL.createObjectURL(pdfBlob);
        const newWindow = window.open(url, '_blank');
        
        if (!newWindow) {
          // Fallback if popup blocked
          alert('Popup blocked. Please allow popups to preview invoices.');
          // Still allow download as fallback
          const link = document.createElement('a');
          link.href = url;
          link.download = `invoice_${invoice.invoiceNo}_preview.pdf`;
          link.click();
        }
        
        // Cleanup URL after a delay
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 10000);
        
        // Reset button
        if (previewButton) {
          previewButton.disabled = false;
          previewButton.innerHTML = '<mat-icon>visibility</mat-icon>';
        }
      },
      error: (error) => {
        console.error('Error previewing PDF:', error);
        alert('Failed to preview invoice PDF. Please try again.');
        
        // Reset button
        if (previewButton) {
          previewButton.disabled = false;
          previewButton.innerHTML = '<mat-icon>visibility</mat-icon>';
        }
      }
    });
  }

  // Refresh data
  refreshData(): void {
    console.log('Refreshing all finance data');
    if (this.currentVendorId) {
      this.loadAllData();
    }
  }

  // Check if any data is loading
  isLoading(): boolean {
    return this.isLoadingInvoice || this.isLoadingPayment || this.isLoadingCredit || this.isLoadingDebit;
  }

  // Debug method to check data
  debugData(): void {
    console.log('=== FINANCE COMPONENT DEBUG ===');
    console.log('Vendor ID:', this.currentVendorId);
    console.log('Invoice Data:', this.invoiceDataSource.data);
    console.log('Payment Data:', this.paymentDataSource.data);
    console.log('Credit Data:', this.creditDataSource.data);
    console.log('Debit Data:', this.debitDataSource.data);
    console.log('Loading states:', {
      invoice: this.isLoadingInvoice,
      payment: this.isLoadingPayment,
      credit: this.isLoadingCredit,
      debit: this.isLoadingDebit
    });
  }
}