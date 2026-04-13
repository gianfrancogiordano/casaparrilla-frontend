import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, map } from 'rxjs';
import { Order } from './orders.service';

export interface DashboardMetrics {
  ventasHoy: number;
  ordenesActivas: number;
  ordenesEnCocina: number;
  completadasHoy: number;
  ticketPromedio: number;
}

export interface TopProduct {
  nombre: string;
  ventas: number;
  pct: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  recentOrders: Order[];
  topProducts: TopProduct[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly API = `${environment.apiUrl}/orders`;

  constructor(private http: HttpClient) {}

  getDashboardData(): Observable<DashboardData> {
    return this.http.get<Order[]>(this.API).pipe(
      map((orders) => this.calcular(orders)),
    );
  }

  private calcular(orders: Order[]): DashboardData {
    // Calcular el inicio del día en Venezuela (UTC-4)
    const hoyVET = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Caracas',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
    
    const inicioHoyTime = new Date(`${hoyVET}T00:00:00-04:00`).getTime();

    // Órdenes de hoy (VET)
    const ordersHoy = orders.filter((o) => {
      return new Date(o.createdAt).getTime() >= inicioHoyTime;
    });

    // Métricas
    const pagadasHoy   = ordersHoy.filter((o) => o.status === 'Pagado' || o.status === 'Entregado');
    const ventasHoy    = pagadasHoy.reduce((sum, o) => sum + (o.totals?.total ?? 0), 0);
    const activas      = orders.filter((o) => !['Pagado', 'Entregado', 'Cancelado', 'Cerrado'].includes(o.status));
    const enCocina     = orders.filter((o) => o.status === 'En Cocina');
    const ticketProm   = pagadasHoy.length > 0 ? ventasHoy / pagadasHoy.length : 0;

    // Últimas 8 órdenes (todas)
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    // Top productos: conteo de ventas por nombre de producto
    const productMap: Record<string, number> = {};
    orders
      .filter((o) => o.status === 'Pagado' || o.status === 'Entregado')
      .forEach((o) => {
        o.items?.forEach((item) => {
          productMap[item.productName] = (productMap[item.productName] ?? 0) + item.quantity;
        });
      });

    const sorted = Object.entries(productMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const maxVentas = sorted[0]?.[1] ?? 1;
    const topProducts: TopProduct[] = sorted.map(([nombre, ventas]) => ({
      nombre,
      ventas,
      pct: Math.round((ventas / maxVentas) * 100),
    }));

    return {
      metrics: {
        ventasHoy,
        ordenesActivas: activas.length,
        ordenesEnCocina: enCocina.length,
        completadasHoy: pagadasHoy.length,
        ticketPromedio: ticketProm,
      },
      recentOrders,
      topProducts,
    };
  }
}
