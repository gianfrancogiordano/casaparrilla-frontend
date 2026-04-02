import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Role {
  _id: string;
  name: string;
  description?: string;
}

export interface Usuario {
  _id: string;
  name: string;
  email: string;
  role: Role | string;
  active: boolean;
  createdAt?: string;
}

export interface CreateUsuarioPayload {
  name: string;
  email: string;
  password: string;
  role: string; // role _id
  active: boolean;
}

export interface UpdateUsuarioPayload {
  name?: string;
  email?: string;
  password?: string; // si viene vacío el backend lo ignora
  role?: string;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly API = `${environment.apiUrl}/users`;
  private readonly ROLES_API = `${environment.apiUrl}/roles`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.API);
  }

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(this.ROLES_API);
  }

  create(payload: CreateUsuarioPayload): Observable<Usuario> {
    return this.http.post<Usuario>(this.API, payload);
  }

  update(id: string, payload: UpdateUsuarioPayload): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.API}/${id}`, payload);
  }

  toggleActive(id: string, active: boolean): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.API}/${id}`, { active });
  }

  delete(id: string): Observable<Usuario> {
    return this.http.delete<Usuario>(`${this.API}/${id}`);
  }

  getRoleName(usuario: Usuario): string {
    if (!usuario.role) return '—';
    return typeof usuario.role === 'object' ? usuario.role.name : '—';
  }
}
