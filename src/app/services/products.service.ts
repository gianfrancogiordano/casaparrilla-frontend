import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface RecipeItem {
  ingredientId: string;
  ingredientName: string;
  quantityRequired: number;
  unitMeasure: string;
}

export interface Product {
  _id: string;
  name: string;
  description?: string;
  sellPrice: number;
  category?: string;
  imageUrl?: string;
  available: boolean;
  requiresKitchen?: boolean;
  recipe: RecipeItem[];
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly API = `${environment.apiUrl}/products`;
  constructor(private http: HttpClient) {}

  getAll(): Observable<Product[]> {
    return this.http.get<Product[]>(this.API);
  }

  getOne(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.API}/${id}`);
  }

  create(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(this.API, product);
  }

  update(id: string, product: Partial<Product>): Observable<Product> {
    return this.http.patch<Product>(`${this.API}/${id}`, product);
  }

  delete(id: string): Observable<Product> {
    return this.http.delete<Product>(`${this.API}/${id}`);
  }

  getCategories(): string[] {
    return ['Parrillas', 'Entradas', 'Acompañantes', 'Bebidas', 'Postres', 'Licores'];
  }
}
