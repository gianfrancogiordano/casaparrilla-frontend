import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Address {
  type: string;
  street: string;
  reference: string;
  isDefault: boolean;
}

export interface Client {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  loyaltyPoints: number;
  addresses: Address[];
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientsService {
  private readonly API = `${environment.apiUrl}/clients`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Client[]> {
    return this.http.get<Client[]>(this.API);
  }

  getOne(id: string): Observable<Client> {
    return this.http.get<Client>(`${this.API}/${id}`);
  }

  create(client: Partial<Client>): Observable<Client> {
    return this.http.post<Client>(this.API, client);
  }

  update(id: string, client: Partial<Client>): Observable<Client> {
    return this.http.patch<Client>(`${this.API}/${id}`, client);
  }

  delete(id: string): Observable<Client> {
    return this.http.delete<Client>(`${this.API}/${id}`);
  }

  /** Búsqueda rápida por nombre o teléfono */
  search(term: string): Observable<Client[]> {
    // Por ahora el backend no tiene un endpoint /search explícito, 
    // pero podemos filtrar en el frontend o extender el backend si es necesario.
    // Usaremos el getAll y filtraremos por ahora para no complicar el backend.
    return this.http.get<Client[]>(this.API);
  }
}
