import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type UnitMeasure = 'Kg' | 'Gramos' | 'Litros' | 'Ml' | 'Unidades' | 'Porciones';

export interface Ingredient {
  _id: string;
  name: string;
  unitMeasure: UnitMeasure;
  unitCost: number;
  currentStock: number;
  minStock: number;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class IngredientsService {
  private apiUrl = `${environment.apiUrl}/ingredients`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Ingredient[]> {
    return this.http.get<Ingredient[]>(this.apiUrl);
  }

  getLowStock(): Observable<Ingredient[]> {
    return this.http.get<Ingredient[]>(`${this.apiUrl}/low-stock`);
  }

  getOne(id: string): Observable<Ingredient> {
    return this.http.get<Ingredient>(`${this.apiUrl}/${id}`);
  }

  create(ingredient: Partial<Ingredient>): Observable<Ingredient> {
    return this.http.post<Ingredient>(this.apiUrl, ingredient);
  }

  update(id: string, ingredient: Partial<Ingredient>): Observable<Ingredient> {
    return this.http.patch<Ingredient>(`${this.apiUrl}/${id}`, ingredient);
  }

  delete(id: string): Observable<Ingredient> {
    return this.http.delete<Ingredient>(`${this.apiUrl}/${id}`);
  }

  adjustStock(id: string, delta: number): Observable<Ingredient> {
    return this.http.post<Ingredient>(`${this.apiUrl}/${id}/adjust-stock`, { delta });
  }

  getUnits(): UnitMeasure[] {
    return ['Kg', 'Gramos', 'Litros', 'Ml', 'Unidades', 'Porciones'];
  }
}
