import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdersService, Order } from '../../services/orders.service';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../services/auth.service';

interface Filtros {
  busqueda: string;
  fechaDesde: string;
  fechaHasta: string;
  estado: string;
  metodoPago: string;
}

interface Stats {
  total: number;
  activas: number;
  pagadas: number;
  ingresos: number;
}

interface ResumenPago {
  metodo: string;
  total: number;
}

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './pedidos.component.html',
  styleUrl: './pedidos.component.scss'
})
export class PedidosComponent implements OnInit {
  ordenes: Order[] = [];
  ordenesFiltradas: Order[] = [];

  stats: Stats = { total: 0, activas: 0, pagadas: 0, ingresos: 0 };
  resumenPago: ResumenPago[] = [];

  filtros: Filtros = {
    busqueda: '',
    fechaDesde: '',
    fechaHasta: '',
    estado: '',
    metodoPago: '',
  };

  // Modal de detalle
  mostrarDetalle = false;
  ordenSeleccionada: Order | null = null;

  constructor(
    private ordersService: OrdersService,
    private alertService: AlertService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    if (this.authService.isMesero()) {
      this.setFechaHoy();
    } else {
      this.setFechaHoy(); // For security/consistency
      this.cargarOrdenes();
    }
  }

  cargarOrdenes(): void {
    this.ordersService.getAll().subscribe({
      next: (data) => {
        // Ordenar por más reciente primero
        this.ordenes = data.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.aplicarFiltros();
      }
    });
  }

  // ── Filtros ────────────────────────────────────────────────────────────────

  aplicarFiltros(): void {
    let resultado = [...this.ordenes];

    // Filtro de búsqueda (mesa, mesero, número de orden)
    if (this.filtros.busqueda.trim()) {
      const term = this.filtros.busqueda.toLowerCase().trim();
      resultado = resultado.filter(o =>
        o.orderNumber?.toLowerCase().includes(term) ||
        o.table?.toLowerCase().includes(term) ||
        this.getMeseroNombre(o).toLowerCase().includes(term)
      );
    }

    // Filtro de estado
    if (this.filtros.estado) {
      resultado = resultado.filter(o => o.status === this.filtros.estado);
    }

    // Filtro de método de pago
    if (this.filtros.metodoPago) {
      resultado = resultado.filter(o => o.paymentInfo?.method === this.filtros.metodoPago);
    }

    // Filtro de fecha desde (America/Caracas)
    if (this.filtros.fechaDesde) {
      const desdeVET = this.filtros.fechaDesde + 'T00:00:00-04:00';
      const desdeTime = new Date(desdeVET).getTime();
      resultado = resultado.filter(o => new Date(o.createdAt).getTime() >= desdeTime);
    }

    // Filtro de fecha hasta (America/Caracas)
    if (this.filtros.fechaHasta) {
      const hastaVET = this.filtros.fechaHasta + 'T23:59:59-04:00';
      const hastaTime = new Date(hastaVET).getTime();
      resultado = resultado.filter(o => new Date(o.createdAt).getTime() <= hastaTime);
    }

    this.ordenesFiltradas = resultado;
    this.calcularStats(resultado);
    this.calcularResumenPago(resultado);
  }

  setFechaHoy(): void {
    // Obtener hoy en formato YYYY-MM-DD según la zona horaria de Venezuela
    const hoy = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Caracas',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
    
    this.filtros.fechaDesde = hoy;
    this.filtros.fechaHasta = hoy;
    this.cargarOrdenes();
  }

  limpiarFiltros(): void {
    if (this.authService.isMesero()) {
      this.setFechaHoy();
      return;
    }
    this.filtros = {
      busqueda: '',
      fechaDesde: '',
      fechaHasta: '',
      estado: '',
      metodoPago: '',
    };
    this.cargarOrdenes();
  }

  // ── Estadísticas ───────────────────────────────────────────────────────────

  calcularStats(ordenes: Order[]): void {
    const estadosActivos = ['Abierta', 'En Cocina', 'Lista'];
    this.stats = {
      total: ordenes.length,
      activas: ordenes.filter(o => estadosActivos.includes(o.status)).length,
      pagadas: ordenes.filter(o => o.status === 'Pagado' || o.status === 'Entregado').length,
      ingresos: ordenes
        .filter(o => o.status === 'Pagado' || o.status === 'Entregado')
        .reduce((sum, o) => sum + (o.totals?.total ?? 0), 0),
    };
  }

  calcularResumenPago(ordenes: Order[]): void {
    const pagadas = ordenes.filter(o => (o.status === 'Pagado' || o.status === 'Entregado') && o.paymentInfo?.method);
    const mapa: Record<string, number> = {};

    for (const o of pagadas) {
      const m = o.paymentInfo.method!;
      mapa[m] = (mapa[m] ?? 0) + o.totals.total;
    }

    this.resumenPago = Object.entries(mapa).map(([metodo, total]) => ({ metodo, total }));
  }

  // ── Modal de Detalle ───────────────────────────────────────────────────────

  abrirDetalle(orden: Order): void {
    this.ordenSeleccionada = orden;
    this.mostrarDetalle = true;
  }

  cerrarDetalle(): void {
    this.mostrarDetalle = false;
    this.ordenSeleccionada = null;
  }

  // ── Acciones ───────────────────────────────────────────────────────────────

  async cancelarOrden(orden: Order): Promise<void> {
    const confirmar = await this.alertService.confirm(
      'Cancelar Orden',
      `¿Estás seguro de que deseas cancelar la orden #${orden.orderNumber} de la Mesa ${orden.table}?`,
      'Sí, cancelar'
    );
    
    if (!confirmar) return;

    this.ordersService.cancelOrder(orden._id).subscribe({
      next: () => {
        this.alertService.toast('Orden cancelada');
        this.cargarOrdenes();
      },
      error: () => this.alertService.error('No se pudo cancelar la orden')
    });
  }

  // ── Helpers de UI ──────────────────────────────────────────────────────────

  getMeseroNombre(orden: Order): string {
    if (!orden.waiterId) return '—';
    return typeof orden.waiterId === 'object' ? (orden.waiterId as any).name ?? '—' : '—';
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Recibido':   's-recibido',
      'Abierta':    's-abierta',
      'En Cocina':  's-cocina',
      'Lista':      's-lista',
      'En Camino':  's-camino',
      'Entregado':  's-pagado',
      'Pagado':     's-pagado',
      'Cancelado':  's-cancelado',
    };
    return map[status] ?? 's-abierta';
  }

  getStatusHeaderClass(status: string): string {
    const map: Record<string, string> = {
      'Recibido':   'h-recibido',
      'Abierta':    'h-abierta',
      'En Cocina':  'h-cocina',
      'Lista':      'h-lista',
      'En Camino':  'h-camino',
      'Entregado':  'h-pagado',
      'Pagado':     'h-pagado',
      'Cancelado':  'h-cancelado',
    };
    return map[status] ?? 'h-abierta';
  }

  getMetodoPagoBadge(orden: Order): string {
    const map: Record<string, string> = {
      'Efectivo':    'mp-efectivo',
      'Pago Movil':  'mp-movil',
      'Zelle':       'mp-zelle',
      'Binance':     'mp-binance',
      'Bancolombia': 'mp-bancolombia',
    };
    return map[orden.paymentInfo?.method ?? ''] ?? 'mp-none';
  }
}
