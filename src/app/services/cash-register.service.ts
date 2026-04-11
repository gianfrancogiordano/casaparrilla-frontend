import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface CashWithdrawal {
  amount: number;
  reason: string;
  timestamp: string;
}

export interface SalesSummary {
  efectivo: number;
  pagoMovil: number;
  zelle: number;
  binance: number;
  bancolombia: number;
  totalVentas: number;
  cantidadOrdenes: number;
}

export interface CashRegister {
  _id: string;
  openedAt: string;
  closedAt?: string;
  initialAmount: number;
  expectedAmount: number;
  realAmount: number;
  difference: number;
  status: 'Abierta' | 'Cerrada';
  openedBy: any;
  closedBy?: any;
  withdrawals: CashWithdrawal[];
  salesSummary: SalesSummary;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class CashRegisterService {
  private readonly API = `${environment.apiUrl}/cash-register`;

  constructor(private http: HttpClient) {}

  getCurrent(): Observable<CashRegister | null> {
    return this.http.get<CashRegister | null>(`${this.API}/current`);
  }

  getHistory(limit = 30): Observable<CashRegister[]> {
    return this.http.get<CashRegister[]>(`${this.API}/history?limit=${limit}`);
  }

  open(userId: string, initialAmount: number): Observable<CashRegister> {
    return this.http.post<CashRegister>(`${this.API}/open`, { userId, initialAmount });
  }

  close(id: string, userId: string, realAmount: number, notes?: string): Observable<CashRegister> {
    return this.http.post<CashRegister>(`${this.API}/${id}/close`, { userId, realAmount, notes });
  }

  withdraw(id: string, amount: number, reason: string): Observable<CashRegister> {
    return this.http.post<CashRegister>(`${this.API}/${id}/withdraw`, { amount, reason });
  }
}
