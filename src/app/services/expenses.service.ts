import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface Expense {
  _id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  userId?: any;
  receiptUrl?: string;
  notes?: string;
  createdAt?: string;
}

export interface ExpenseSummary {
  totalGastos: number;
  cantidad: number;
  categorias: { category: string; total: number }[];
}

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private readonly API = `${environment.apiUrl}/expenses`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Expense[]> {
    return this.http.get<Expense[]>(this.API);
  }

  getOne(id: string): Observable<Expense> {
    return this.http.get<Expense>(`${this.API}/${id}`);
  }

  create(expense: Partial<Expense>): Observable<Expense> {
    return this.http.post<Expense>(this.API, expense);
  }

  update(id: string, expense: Partial<Expense>): Observable<Expense> {
    return this.http.patch<Expense>(`${this.API}/${id}`, expense);
  }

  delete(id: string): Observable<Expense> {
    return this.http.delete<Expense>(`${this.API}/${id}`);
  }

  getSummary(from?: string, to?: string): Observable<ExpenseSummary> {
    let url = `${this.API}/summary`;
    const params: string[] = [];
    if (from) params.push(`from=${from}`);
    if (to) params.push(`to=${to}`);
    if (params.length) url += `?${params.join('&')}`;
    return this.http.get<ExpenseSummary>(url);
  }

  getCategories(): string[] {
    return ['Alquiler', 'Servicios', 'Gas', 'Limpieza', 'Mantenimiento', 'Marketing', 'Nómina', 'Compras Insumos', 'Transporte', 'Otros'];
  }
}
