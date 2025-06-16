import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { CommonModule, DatePipe } from '@angular/common';
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

// Simplified interfaces matching backend response
export interface RFQData {
  ebeln: string;   // RFQ Number
  lifnr: string;   // Vendor ID
  bedat: string;   // Document Date
  ebelp: string;   // Item Number
  matnr: string;   // Material Number
  meins: string;   // Unit
  txz01: string;   // Description
}

export interface POData {
  ebeln: string;   // PO Number
  lifnr: string;   // Vendor ID
  bedat: string;   // Document Date
  ebelp: string;   // Item Number
  matnr: string;   // Material Number
  txz01: string;   // Description
  meins: string;   // Unit
  netpr: string;   // Net Price
  waers: string;   // Currency
  bstyp: string;   // PO Type
}

export interface GRData {
  mblnr: string;   // Material Doc Number
  mjahr: string;   // Fiscal Year
  ebeln: string;   // Purchase Order
  ebelp: string;   // PO Item
  matnr: string;   // Material Number
  menge: string;   // Quantity
  meins: string;   // Unit
  budat: string;   // Posting Date
  lifnr: string;   // Vendor ID
  werks: string;   // Plant
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
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
    DatePipe
  ]
})
export class DashboardComponent implements OnInit, AfterViewInit {
  expandedCard: number | null = null;

  // Table data sources
  rfqDataSource = new MatTableDataSource<RFQData>([]);
  poDataSource = new MatTableDataSource<POData>([]);
  grDataSource = new MatTableDataSource<GRData>([]);

  // Updated table column definitions with proper order
  displayedColumnsRFQ: string[] = ['ebeln', 'bedat', 'matnr', 'txz01', 'meins', 'ebelp'];
  displayedColumnsPO: string[] = ['ebeln', 'bedat', 'matnr', 'txz01', 'netpr', 'waers', 'meins'];
  displayedColumnsGR: string[] = ['mblnr', 'budat', 'ebeln', 'matnr', 'ebelp', 'meins'];

  // ViewChild references for pagination and sorting
  @ViewChild('rfqPaginator') rfqPaginator!: MatPaginator;
  @ViewChild('poPaginator') poPaginator!: MatPaginator;
  @ViewChild('grPaginator') grPaginator!: MatPaginator;
  
  @ViewChild('rfqTable', { read: MatSort }) rfqSort!: MatSort;
  @ViewChild('poTable', { read: MatSort }) poSort!: MatSort;
  @ViewChild('grTable', { read: MatSort }) grSort!: MatSort;

  // Loading states
  isLoadingRFQ: boolean = false;
  isLoadingPO: boolean = false;
  isLoadingGR: boolean = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Get vendorId from localStorage
    const vendorId = localStorage.getItem('vendorId');
    
    if (!vendorId) {
      console.error('No vendorId found in localStorage');
      return;
    }

    console.log('Loading data for vendor:', vendorId);
    this.fetchRFQData(vendorId);
    this.fetchPOData(vendorId);
    this.fetchGRData(vendorId);
  }

  ngAfterViewInit(): void {
    // Setup pagination and sorting for all tables
    setTimeout(() => {
      this.setupAllTables();
    }, 100);
  }

  private setupAllTables(): void {
    // Setup RFQ table
    if (this.rfqPaginator && this.rfqSort) {
      this.rfqDataSource.paginator = this.rfqPaginator;
      this.rfqDataSource.sort = this.rfqSort;
    }

    // Setup PO table
    if (this.poPaginator && this.poSort) {
      this.poDataSource.paginator = this.poPaginator;
      this.poDataSource.sort = this.poSort;
    }

    // Setup GR table
    if (this.grPaginator && this.grSort) {
      this.grDataSource.paginator = this.grPaginator;
      this.grDataSource.sort = this.grSort;
    }

    // Setup custom filter predicates for better search
    this.rfqDataSource.filterPredicate = (data: RFQData, filter: string) => {
      const searchString = `${data.ebeln} ${data.matnr} ${data.txz01}`.toLowerCase();
      return searchString.includes(filter);
    };

    this.poDataSource.filterPredicate = (data: POData, filter: string) => {
      const searchString = `${data.ebeln} ${data.matnr} ${data.txz01}`.toLowerCase();
      return searchString.includes(filter);
    };

    this.grDataSource.filterPredicate = (data: GRData, filter: string) => {
      const searchString = `${data.mblnr} ${data.matnr} ${data.ebeln}`.toLowerCase();
      return searchString.includes(filter);
    };
  }

  toggleCard(index: number) {
    this.expandedCard = this.expandedCard === index ? null : index;
  }

  applyFilter(event: Event, type: string) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    if (type === 'rfq') {
      this.rfqDataSource.filter = filterValue;
      if (this.rfqDataSource.paginator) {
        this.rfqDataSource.paginator.firstPage();
      }
    } else if (type === 'po') {
      this.poDataSource.filter = filterValue;
      if (this.poDataSource.paginator) {
        this.poDataSource.paginator.firstPage();
      }
    } else if (type === 'gr') {
      this.grDataSource.filter = filterValue;
      if (this.grDataSource.paginator) {
        this.grDataSource.paginator.firstPage();
      }
    }
  }

  // Fetch RFQ data - Simplified to use direct backend response
  fetchRFQData(vendorId: string) {
    this.isLoadingRFQ = true;
    console.log('Fetching RFQ data for vendor:', vendorId);
    
    this.http.post<RFQData[]>('http://localhost:3000/vendorrfq', { vendorId }).subscribe({
      next: (data) => {
        console.log('RFQ Response received:', data);
        
        // Handle both array and single object responses
        const dataArray = Array.isArray(data) ? data : [data];
        
        // Process dates and assign directly
        const processedData = dataArray.map((item: RFQData) => ({
          ...item,
          bedat: this.formatSAPDate(item.bedat || '')
        }));

        this.rfqDataSource.data = processedData;
        console.log('RFQ DataSource updated with', processedData.length, 'items');
        
        // Re-setup table after data update
        setTimeout(() => {
          if (this.rfqPaginator && this.rfqSort) {
            this.rfqDataSource.paginator = this.rfqPaginator;
            this.rfqDataSource.sort = this.rfqSort;
          }
        }, 100);
        
        this.isLoadingRFQ = false;
      },
      error: (err) => {
        console.error('Error fetching RFQ data:', err);
        this.isLoadingRFQ = false;
      }
    });
  }

  // Fetch PO data - Simplified to use direct backend response
  fetchPOData(vendorId: string) {
    this.isLoadingPO = true;
    console.log('Fetching PO data for vendor:', vendorId);
    
    this.http.post<POData[]>('http://localhost:3000/vendorpo', { vendorId }).subscribe({
      next: (data) => {
        console.log('PO Response received:', data);
        
        // Handle both array and single object responses
        const dataArray = Array.isArray(data) ? data : [data];
        
        // Process dates and assign directly
        const processedData = dataArray.map((item: POData) => ({
          ...item,
          bedat: this.formatSAPDate(item.bedat || ''),
          netpr: this.formatCurrency(item.netpr || '0')
        }));

        this.poDataSource.data = processedData;
        console.log('PO DataSource updated with', processedData.length, 'items');
        
        // Re-setup table after data update
        setTimeout(() => {
          if (this.poPaginator && this.poSort) {
            this.poDataSource.paginator = this.poPaginator;
            this.poDataSource.sort = this.poSort;
          }
        }, 100);
        
        this.isLoadingPO = false;
      },
      error: (err) => {
        console.error('Error fetching PO data:', err);
        this.isLoadingPO = false;
      }
    });
  }

  // Fetch GR data - Simplified to use direct backend response
  fetchGRData(vendorId: string) {
    this.isLoadingGR = true;
    console.log('Fetching GR data for vendor:', vendorId);
    
    this.http.post<GRData[]>('http://localhost:3000/vendorgr', { vendorId }).subscribe({
      next: (data) => {
        console.log('GR Response received:', data);
        
        // Handle both array and single object responses
        const dataArray = Array.isArray(data) ? data : [data];
        
        // Process dates and assign directly
        const processedData = dataArray.map((item: GRData) => ({
          ...item,
          budat: this.formatSAPDate(item.budat || '')
        }));

        this.grDataSource.data = processedData;
        console.log('GR DataSource updated with', processedData.length, 'items');
        
        // Re-setup table after data update
        setTimeout(() => {
          if (this.grPaginator && this.grSort) {
            this.grDataSource.paginator = this.grPaginator;
            this.grDataSource.sort = this.grSort;
          }
        }, 100);
        
        this.isLoadingGR = false;
      },
      error: (err) => {
        console.error('Error fetching GR data:', err);
        this.isLoadingGR = false;
      }
    });
  }

  // Helper method to format SAP dates
  private formatSAPDate(sapDate: string): string {
    if (!sapDate) return '';
    
    // Handle /Date(timestamp)/ format from OData
    if (sapDate.includes('/Date(')) {
      const timestamp = sapDate.match(/\d+/)?.[0];
      if (timestamp) {
        const date = new Date(parseInt(timestamp));
        return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
      }
    }
    
    // Handle YYYYMMDD format
    if (sapDate.length === 8) {
      const year = sapDate.substring(0, 4);
      const month = sapDate.substring(4, 6);
      const day = sapDate.substring(6, 8);
      return `${year}-${month}-${day}`;
    }
    
    return sapDate;
  }

  // Format currency
  private formatCurrency(amount: string): string {
    if (!amount) return '₹0';
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return '₹0';
    
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount);
  }

  // Get total count for hero stats
  getTotalCount(type: string): number {
    switch(type) {
      case 'rfq':
        return this.rfqDataSource.data.length;
      case 'po':
        return this.poDataSource.data.length;
      case 'gr':
        return this.grDataSource.data.length;
      default:
        return 0;
    }
  }

  // Handle tab changes
  onTabChange(event: MatTabChangeEvent): void {
    console.log('Tab changed to:', event.index);
    
    // Small delay to ensure the view has updated
    setTimeout(() => {
      this.setupAllTables();
    }, 150);
  }

  // Refresh data
  refreshData(): void {
    const vendorId = localStorage.getItem('vendorId');
    if (vendorId) {
      console.log('Refreshing all data for vendor:', vendorId);
      this.fetchRFQData(vendorId);
      this.fetchPOData(vendorId);
      this.fetchGRData(vendorId);
    }
  }

  // Check if any data is loading
  isLoading(): boolean {
    return this.isLoadingRFQ || this.isLoadingPO || this.isLoadingGR;
  }
}