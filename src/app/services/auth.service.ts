import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface CurrentUser {
  id: string;
  name: string;
  role: string; // 'Administrador' | 'Mesero' | 'Parrillero' | ...
}

export interface LoginResponse {
  access_token: string;
  user: CurrentUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API_URL  = environment.apiUrl;
  private readonly TOKEN_KEY = 'cp_access_token';
  private readonly USER_KEY  = 'cp_user';

  constructor(private http: HttpClient, private router: Router) {}

  login(name: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.API_URL}/auth/login`, { name, password })
      .pipe(
        tap((response) => {
          localStorage.setItem(this.TOKEN_KEY, response.access_token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
        }),
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getCurrentUser(): CurrentUser | null {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  /** Devuelve el nombre del rol del usuario actual */
  getRole(): string {
    return this.getCurrentUser()?.role ?? '';
  }

  /** Verifica si el usuario tiene alguno de los roles indicados */
  hasRole(...roles: string[]): boolean {
    return roles.includes(this.getRole());
  }

  isAdmin(): boolean     { return this.hasRole('Administrador'); }
  isMesero(): boolean    { return this.hasRole('Mesero'); }
  isParrillero(): boolean { return this.hasRole('Parrillero'); }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}
