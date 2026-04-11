import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportsService, PnlReport, BreakEvenReport, ProfitabilityReport, TrendsReport } from '../../services/reports.service';
import { SalesChartComponent } from '../../components/sales-chart/sales-chart.component';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DecimalPipe, SalesChartComponent],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.scss'
})
export class ReportesComponent implements OnInit {
  // Filtros
  filtroDesde = '';
  filtroHasta = '';
  vistaActiva: 'pnl' | 'equilibrio' | 'rentabilidad' | 'tendencias' = 'pnl';

  // Data
  pnl: PnlReport | null = null;
  breakEven: BreakEvenReport | null = null;
  profitability: ProfitabilityReport | null = null;
  trends: TrendsReport | null = null;
  cargando = false;

  constructor(private reportsService: ReportsService) {}

  ngOnInit(): void {
    this.setMesActual();
  }

  setMesActual(): void {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    this.filtroDesde = `${year}-${month}-01`;
    this.filtroHasta = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Caracas',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(hoy);
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.cargarPnl();
    this.cargarBreakEven();
    this.cargarProfitability();
    this.cargarTrends();
  }

  cargarPnl(): void {
    this.cargando = true;
    this.reportsService.getPnl(this.filtroDesde, this.filtroHasta).subscribe({
      next: (data) => { this.pnl = data; this.cargando = false; },
      error: () => this.cargando = false
    });
  }

  cargarBreakEven(): void {
    this.reportsService.getBreakEven(this.filtroDesde, this.filtroHasta).subscribe({
      next: (data) => this.breakEven = data
    });
  }

  cargarProfitability(): void {
    this.reportsService.getProfitability().subscribe({
      next: (data) => this.profitability = data
    });
  }

  cargarTrends(): void {
    this.reportsService.getTrends(this.filtroDesde, this.filtroHasta).subscribe({
      next: (data) => this.trends = data
    });
  }

  setVista(vista: 'pnl' | 'equilibrio' | 'rentabilidad' | 'tendencias'): void {
    this.vistaActiva = vista;
  }

  // ── Helpers P&L ────────────────────────────────────────────────────

  getUtilidadClass(): string {
    if (!this.pnl) return '';
    return this.pnl.utilidadNeta >= 0 ? 'text-success' : 'text-danger';
  }

  getMargenClass(margen: number): string {
    if (margen >= 20) return 'text-success';
    if (margen >= 10) return 'text-warning';
    return 'text-danger';
  }

  getFoodCostClass(pct: number): string {
    if (pct <= 28) return 'fc-excellent';
    if (pct <= 35) return 'fc-good';
    return 'fc-danger';
  }

  getFoodCostLabel(pct: number): string {
    if (pct <= 28) return '🟢 Excelente';
    if (pct <= 35) return '🟡 Aceptable';
    return '🔴 Alto';
  }

  getPaymentMethods(): { method: string; amount: number }[] {
    if (!this.pnl) return [];
    return Object.entries(this.pnl.ventasPorMetodo)
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  getOrderTypes(): { tipo: string; ingresos: number; cantidad: number }[] {
    if (!this.pnl) return [];
    return Object.entries(this.pnl.ventasPorTipo)
      .map(([tipo, data]) => ({ tipo, ...data }))
      .sort((a, b) => b.ingresos - a.ingresos);
  }

  getExpenseCategories(): { category: string; total: number }[] {
    if (!this.pnl) return [];
    return Object.entries(this.pnl.gastosPorCategoria)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }

  // ── Helpers Break-Even ─────────────────────────────────────────────

  getSemaforoClass(): string {
    if (!this.breakEven) return '';
    const map: Record<string, string> = {
      'verde': 'semaforo-verde',
      'amarillo': 'semaforo-amarillo',
      'rojo': 'semaforo-rojo'
    };
    return map[this.breakEven.semaforo] || '';
  }

  getSemaforoIcon(): string {
    if (!this.breakEven) return '';
    const map: Record<string, string> = {
      'verde': '🟢', 'amarillo': '🟡', 'rojo': '🔴'
    };
    return map[this.breakEven.semaforo] || '';
  }

  getSemaforoLabel(): string {
    if (!this.breakEven) return '';
    const map: Record<string, string> = {
      'verde': 'Por encima del punto de equilibrio',
      'amarillo': 'Cerca del punto de equilibrio',
      'rojo': 'Por debajo del punto de equilibrio'
    };
    return map[this.breakEven.semaforo] || '';
  }

  getProgressPct(): number {
    if (!this.breakEven || this.breakEven.puntoEquilibrioDolares === 0) return 0;
    return Math.min(100, (this.breakEven.ventasActuales / this.breakEven.puntoEquilibrioDolares) * 100);
  }

  // ── Helpers Trends ─────────────────────────────────────────────────

  getMaxVenta(): number {
    if (!this.trends) return 1;
    return Math.max(...this.trends.tendencia.map(t => t.ventas), 1);
  }

  getBarHeight(ventas: number): number {
    return (ventas / this.getMaxVenta()) * 100;
  }

  getDayLabel(fecha: string): string {
    const d = new Date(fecha + 'T12:00:00');
    return d.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric' });
  }

  // ── Helpers Tendencias KPIs ────────────────────────────────────────

  getTotalVentas(): number {
    if (!this.trends) return 0;
    return this.trends.tendencia.reduce((sum, t) => sum + t.ventas, 0);
  }

  getTotalOrdenes(): number {
    if (!this.trends) return 0;
    return this.trends.tendencia.reduce((sum, t) => sum + t.ordenes, 0);
  }

  getMejorDia(): string {
    if (!this.trends || this.trends.tendencia.length === 0) return '—';
    const mejor = this.trends.tendencia.reduce((max, t) => t.ventas > max.ventas ? t : max);
    const d = new Date(mejor.fecha + 'T12:00:00');
    return `${d.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' })} · $${mejor.ventas.toFixed(0)}`;
  }
}
