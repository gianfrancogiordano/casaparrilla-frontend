import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface BankAccount {
  _id: string;
  name: string;
  accountType: string;
  accountNumber?: string;
  currency: string;
  balance: number;
  isActive: boolean;
  linkedPaymentMethod?: string;
  notes?: string;
  icon?: string;
  createdAt?: string;
}

export interface BankMovement {
  _id: string;
  accountId: string;
  type: 'Ingreso' | 'Egreso';
  amount: number;
  description: string;
  category: string;
  reference?: string;
  date: string;
  userId?: any;
  orderId?: string;
  notes?: string;
  createdAt?: string;
}

export interface BankSummary {
  accounts: BankAccount[];
  totalBalance: number;
  totalIngresos: number;
  totalEgresos: number;
  cuentasActivas: number;
}

@Injectable({ providedIn: 'root' })
export class BanksService {
  private readonly API = `${environment.apiUrl}/banks`;

  constructor(private http: HttpClient) {}

  // ── Cuentas ─────────────────────────────────────────────────────────

  getAccounts(): Observable<BankAccount[]> {
    return this.http.get<BankAccount[]>(`${this.API}/accounts`);
  }

  createAccount(account: Partial<BankAccount>): Observable<BankAccount> {
    return this.http.post<BankAccount>(`${this.API}/accounts`, account);
  }

  updateAccount(id: string, account: Partial<BankAccount>): Observable<BankAccount> {
    return this.http.patch<BankAccount>(`${this.API}/accounts/${id}`, account);
  }

  deleteAccount(id: string): Observable<BankAccount> {
    return this.http.delete<BankAccount>(`${this.API}/accounts/${id}`);
  }

  // ── Movimientos ─────────────────────────────────────────────────────

  getMovements(accountId: string, from?: string, to?: string, type?: string): Observable<BankMovement[]> {
    let url = `${this.API}/accounts/${accountId}/movements`;
    const params: string[] = [];
    if (from) params.push(`from=${from}`);
    if (to) params.push(`to=${to}`);
    if (type) params.push(`type=${type}`);
    if (params.length) url += `?${params.join('&')}`;
    return this.http.get<BankMovement[]>(url);
  }

  createMovement(movement: Partial<BankMovement>): Observable<BankMovement> {
    return this.http.post<BankMovement>(`${this.API}/movements`, movement);
  }

  deleteMovement(id: string): Observable<BankMovement> {
    return this.http.delete<BankMovement>(`${this.API}/movements/${id}`);
  }

  // ── Resumen ─────────────────────────────────────────────────────────

  getSummary(from?: string, to?: string): Observable<BankSummary> {
    let url = `${this.API}/summary`;
    const params: string[] = [];
    if (from) params.push(`from=${from}`);
    if (to) params.push(`to=${to}`);
    if (params.length) url += `?${params.join('&')}`;
    return this.http.get<BankSummary>(url);
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  getPaymentMethods(): string[] {
    return ['Efectivo', 'Pago Movil', 'Binance', 'Bancolombia', 'Zelle'];
  }

  getAccountTypes(): string[] {
    return ['Corriente', 'Ahorro', 'Digital', 'Efectivo', 'Otro'];
  }

  getCurrencies(): string[] {
    return ['USD', 'BS', 'COP', 'USDT'];
  }

  getMovementCategories(): string[] {
    return ['Venta', 'Capital', 'Transferencia', 'Pago Proveedor', 'Nómina', 'Gasto', 'Retiro', 'Ajuste', 'Otro'];
  }

  getCurrencyIcon(currency: string): string {
    const map: Record<string, string> = { USD: '💲', BS: '🇻🇪', COP: '🇨🇴', USDT: '🪙' };
    return map[currency] || '💰';
  }

  getCategoryIcon(category: string): string {
    const map: Record<string, string> = {
      Venta: '🛒', Capital: '💰', Transferencia: '🔄', 'Pago Proveedor': '🏪',
      'Nómina': '💼', Gasto: '📤', Retiro: '🏧', Ajuste: '📝', Otro: '📎',
    };
    return map[category] || '📎';
  }
}
