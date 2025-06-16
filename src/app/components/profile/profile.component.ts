// import { Component } from '@angular/core';
// import { SidebarComponent } from "../sidebar/sidebar.component";
// import { Router } from '@angular/router';
// import { HttpClientModule } from '@angular/common/http';

// @Component({
//   selector: 'app-profile',
//   standalone: true,
//   imports: [SidebarComponent, HttpClientModule],
//   templateUrl: './profile.component.html',
//   styleUrls: ['./profile.component.css']
// })
// export class ProfileComponent {
//   customerData = {
//     name: 'Pradeish Misara',
//     vendorId: 'VN10239',
//     houseNo: '21',
//     street: 'Main Street, T Nagar',
//     city: 'Chennai',
//     country: 'India',
//     postalCode: '600017',
//     accountType: 'Premium Business'
//   };

//   constructor(private router: Router) {}

//   signOut() {
//     this.router.navigate(['/login']);
//   }
// }

import { Component, OnInit } from '@angular/core';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [SidebarComponent, HttpClientModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  customerData: any = null;
  loading = true;
  errorMessage = '';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    const vendorId = localStorage.getItem('vendorId');
    if (!vendorId) {
      this.router.navigate(['/login']);
      return;
    }

    this.http.post<any>('http://localhost:3000/vendorprofile', { vendorId }).subscribe({
      next: (response) => {
        this.customerData = {
          name: response.name,
          vendorId: response.vendorId,
          houseNo: response.addressNumber || '-',
          street: response.street,
          city: response.city,
          country: response.country,
          postalCode: response.postalCode,
          accountType: 'Premium Business' // This is static unless backend provides it
        };
        this.loading = false;
      },
      error: (error) => {
        console.error('Profile load failed:', error);
        this.errorMessage = 'Could not load profile data.';
        this.loading = false;
      }
    });
  }

  signOut(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
