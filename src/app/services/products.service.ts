import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface Product {
  _id: string;
  name: string;
  description?: string;
  sellPrice: number;
  category?: string;
  imageUrl?: string;
  available: boolean;
  requiresKitchen?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly API = `${environment.apiUrl}/products`;
  constructor(private http: HttpClient) {}

  getAll(): Observable<Product[]> {
    return this.http.get<Product[]>(this.API);
  }
}
