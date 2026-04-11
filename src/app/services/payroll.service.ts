import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

// ─── Employee ─────────────────────────────────────────────────────
export interface Employee {
  _id: string;
  userId?: any;
  name: string;
  cedula?: string;
  phone?: string;
  position: string;
  type: 'Tiempo Completo' | 'Medio Tiempo' | 'Por Turno';
  baseSalary: number;
  payFrequency: 'Semanal' | 'Quincenal' | 'Mensual';
  startDate?: string;
  active: boolean;
  bankName?: string;
  bankAccount?: string;
  notes?: string;
}

// ─── PayrollRecord ────────────────────────────────────────────────
export interface PayrollBonus { description: string; amount: number; }
export interface PayrollDeduction { description: string; amount: number; }

export interface PayrollRecord {
  _id: string;
  employeeId: any;
  periodStart: string;
  periodEnd: string;
  baseSalary: number;
  bonuses: PayrollBonus[];
  deductions: PayrollDeduction[];
  totalBonuses: number;
  totalDeductions: number;
  netPay: number;
  status: 'Pendiente' | 'Pagado';
  paidAt?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt?: string;
}

// ─── Summary ──────────────────────────────────────────────────────
export interface PayrollSummary {
  totalNomina: number;
  totalPagado: number;
  totalPendiente: number;
  cantidadRegistros: number;
  cantidadEmpleados: number;
  costoMensualBase: number;
  empleados: { nombre: string; cargo: string; total: number; registros: number }[];
}

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private readonly API = `${environment.apiUrl}/payroll`;

  constructor(private http: HttpClient) {}

  // ─── Empleados ──────────────────────────────────────────────────
  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.API}/employees`);
  }

  getActiveEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.API}/employees/active`);
  }

  createEmployee(dto: Partial<Employee>): Observable<Employee> {
    return this.http.post<Employee>(`${this.API}/employees`, dto);
  }

  updateEmployee(id: string, dto: Partial<Employee>): Observable<Employee> {
    return this.http.patch<Employee>(`${this.API}/employees/${id}`, dto);
  }

  deleteEmployee(id: string): Observable<Employee> {
    return this.http.delete<Employee>(`${this.API}/employees/${id}`);
  }

  // ─── Nómina ─────────────────────────────────────────────────────
  getPayrolls(): Observable<PayrollRecord[]> {
    return this.http.get<PayrollRecord[]>(this.API);
  }

  getPayroll(id: string): Observable<PayrollRecord> {
    return this.http.get<PayrollRecord>(`${this.API}/${id}`);
  }

  createPayroll(dto: any): Observable<PayrollRecord> {
    return this.http.post<PayrollRecord>(this.API, dto);
  }

  updatePayroll(id: string, dto: any): Observable<PayrollRecord> {
    return this.http.patch<PayrollRecord>(`${this.API}/${id}`, dto);
  }

  deletePayroll(id: string): Observable<PayrollRecord> {
    return this.http.delete<PayrollRecord>(`${this.API}/${id}`);
  }

  markAsPaid(id: string, paymentMethod: string): Observable<PayrollRecord> {
    return this.http.post<PayrollRecord>(`${this.API}/${id}/pay`, { paymentMethod });
  }

  generateBulk(periodStart: string, periodEnd: string): Observable<PayrollRecord[]> {
    return this.http.post<PayrollRecord[]>(`${this.API}/generate`, { periodStart, periodEnd });
  }

  getSummary(from?: string, to?: string): Observable<PayrollSummary> {
    let url = `${this.API}/summary`;
    const params: string[] = [];
    if (from) params.push(`from=${from}`);
    if (to) params.push(`to=${to}`);
    if (params.length) url += `?${params.join('&')}`;
    return this.http.get<PayrollSummary>(url);
  }
}
