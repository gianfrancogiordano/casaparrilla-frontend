import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface FixedExpense {
  _id: string;
  name: string;
  amount: number;
  category: string;
  isActive: boolean;
  notes?: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class FixedExpensesService {
  private readonly API = `${environment.apiUrl}/fixed-expenses`;

  readonly CATEGORIES: string[] = [
    'Alquiler', 'Servicios', 'Gas', 'Limpieza',
    'Mantenimiento', 'Marketing', 'Nómina', 'Transporte', 'Otros',
  ];

  readonly CATEGORY_ICONS: Record<string, string> = {
    'Alquiler': '🏠',
    'Servicios': '💡',
    'Gas': '🔥',
    'Limpieza': '🧹',
    'Mantenimiento': '🔧',
    'Marketing': '📣',
    'Nómina': '💼',
    'Transporte': '🚗',
    'Otros': '📎',
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<FixedExpense[]> {
    return this.http.get<FixedExpense[]>(this.API);
  }

  getActive(): Observable<FixedExpense[]> {
    return this.http.get<FixedExpense[]>(`${this.API}/active`);
  }

  create(dto: Partial<FixedExpense>): Observable<FixedExpense> {
    return this.http.post<FixedExpense>(this.API, dto);
  }

  update(id: string, dto: Partial<FixedExpense>): Observable<FixedExpense> {
    return this.http.patch<FixedExpense>(`${this.API}/${id}`, dto);
  }

  delete(id: string): Observable<FixedExpense> {
    return this.http.delete<FixedExpense>(`${this.API}/${id}`);
  }

  getCategoryIcon(cat: string): string {
    return this.CATEGORY_ICONS[cat] || '📎';
  }
}
