import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { DashboardService, DashboardData } from '../../services/dashboard.service';
import { Order } from '../../services/orders.service';
import { Subscription, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, CurrencyPipe, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  fechaHoy = new Date();
  cargando = true;
  data: DashboardData | null = null;
  private sub: Subscription | null = null;

  // Intervalo de auto-refresh: 60 segundos
  private readonly REFRESH_MS = 60_000;

  constructor(
    private dashboardService: DashboardService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    // Carga inicial y luego refresca cada minuto
    this.sub = interval(this.REFRESH_MS).pipe(
      startWith(0),
      switchMap(() => this.dashboardService.getDashboardData()),
    ).subscribe({
      next: (data) => {
        this.data = data;
        this.cargando = false;
      },
      error: () => { this.cargando = false; },
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // ─── Helpers de UI ────────────────────────────────────────────────────────

  estadoBadge(status: string): string {
    const map: Record<string, string> = {
      'Pagado':    'badge-pagado',
      'Entregado': 'badge-pagado',
      'Abierta':   'badge-pendiente',
      'En Cocina': 'badge-preparacion',
      'Lista':     'badge-entregado',
      'Cancelado': 'badge-cancelado',
    };
    return map[status] ?? 'bg-secondary';
  }

  getMesaLabel(order: Order): string {
    return order.table ? `Mesa ${order.table}` : 'Sin mesa';
  }

  getMeseroLabel(order: Order): string {
    if (!order.waiterId) return '—';
    return typeof order.waiterId === 'object'
      ? (order.waiterId as any).name ?? '—'
      : '—';
  }
}
