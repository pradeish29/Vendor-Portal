import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    HttpClientModule
  ],
})
export class LoginComponent {
  username = '';
  password = '';
  showError = false;

constructor(private http: HttpClient, private router: Router) {}

// login() {
//     const payload = {
//       vendorId: this.username,
//       password: this.password
//     };

//     this.http.post<any>('http://localhost:3000/vendorlogin', payload).subscribe({
//       next: (response) => {
//         console.log('Login response:', response);
        
//         if (response?.message === 'Login successful') {
//           localStorage.setItem('vendorId', this.username);
//           localStorage.setItem('loggedIn', 'true');
//           this.router.navigate(['/home']);
//         } else {
//           this.showError = true;
//         }
//       },
//       error: (error) => {
//         console.error('Login failed:', error);
//         this.showError = true;
//       }
//     });

//     const vendorId = localStorage.getItem('vendorId');
//     this.http.post<any>('http://localhost:3000/vendorprofile', { vendorId }).subscribe({
//       next: (response) => {
//         // /this.customerData = {
//           name: response.name
//           localStorage.setItem('name', response.name);
//         // };
//         // this.showError = false;
//       },
//       error: (error) => {
//         console.error('Profile load failed:', error)
//       }
//     });
//   }

login() {
  const payload = {
    vendorId: this.username,
    password: this.password
  };

  this.http.post<any>('http://localhost:3000/vendorlogin', payload).subscribe({
    next: (response) => {
      console.log('Login response:', response);
      
      if (response?.message === 'Login successful') {
        localStorage.setItem('vendorId', this.username);
        localStorage.setItem('loggedIn', 'true');

        // Now fetch the vendor profile only after login is successful
        this.http.post<any>('http://localhost:3000/vendorprofile', { vendorId: this.username }).subscribe({
          next: (profileResponse) => {
            localStorage.setItem('name', profileResponse.name);
            this.router.navigate(['/home']);
          },
          error: (profileError) => {
            console.error('Profile load failed:', profileError);
            this.showError = true;
          }
        });

      } else {
        this.showError = true;
      }
    },
    error: (error) => {
      console.error('Login failed:', error);
      this.showError = true;
    }
  });
}

}
