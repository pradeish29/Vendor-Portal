import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private router = inject(Router);

  canActivate(): boolean {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('loggedIn');
      if (token) {
        return true;
      }
    }

    this.router.navigate(['/login']);
    return false;
  } 
}