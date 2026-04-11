import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface PnlReport {
  periodo: { from: string; to: string };
  // Ingresos
  ingresos: number;
  cantidadOrdenes: number;
  ticketPromedio: number;
  // Food cost
  costoVenta: number;
  foodCostPct: number;
  // Egresos desglosados
  gastosVariables: number;
  gastosFijos: number;
  nominaPeriodo: number;
  comprasPeriodo: number;
  totalEgresos: number;
  // Utilidades
  utilidadBruta: number;
  utilidadNeta: number;
  margenBruto: number;
  margenNeto: number;
  // Desgloses
  ventasPorMetodo: Record<string, number>;
  ventasPorTipo: Record<string, { ingresos: number; cantidad: number }>;
  gastosPorCategoria: Record<string, number>;
}

export interface BreakEvenReport {
  costosFijos: number;
  costosVariables: number;
  margenContribucion: number;
  puntoEquilibrioDolares: number;
  puntoEquilibrioOrdenes: number;
  ventasActuales: number;
  diferencia: number;
  semaforo: 'rojo' | 'amarillo' | 'verde';
  ticketPromedio: number;
}

export interface TrendPoint {
  fecha: string;
  ventas: number;
  ordenes: number;
}

export interface TrendsReport {
  tendencia: TrendPoint[];
}

export interface ProductProfitability {
  nombre: string;
  categoria: string;
  precioVenta: number;
  costoReceta: number;
  margen: number;
  margenPct: number;
  foodCostPct: number;
  disponible: boolean;
}

export interface ProfitabilityReport {
  productos: ProductProfitability[];
  foodCostGlobal: number;
  enRiesgo: number;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly API = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  getPnl(from?: string, to?: string): Observable<PnlReport> {
    return this.http.get<PnlReport>(`${this.API}/pnl${this.buildQuery(from, to)}`);
  }

  getBreakEven(from?: string, to?: string): Observable<BreakEvenReport> {
    return this.http.get<BreakEvenReport>(`${this.API}/break-even${this.buildQuery(from, to)}`);
  }

  getTrends(from?: string, to?: string): Observable<TrendsReport> {
    return this.http.get<TrendsReport>(`${this.API}/trends${this.buildQuery(from, to)}`);
  }

  getProfitability(): Observable<ProfitabilityReport> {
    return this.http.get<ProfitabilityReport>(`${this.API}/profitability`);
  }

  private buildQuery(from?: string, to?: string): string {
    const params: string[] = [];
    if (from) params.push(`from=${from}`);
    if (to) params.push(`to=${to}`);
    return params.length ? `?${params.join('&')}` : '';
  }
}
