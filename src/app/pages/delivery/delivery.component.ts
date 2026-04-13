import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdersService, Order } from '../../services/orders.service';
import { SocketService } from '../../services/socket.service';
import { AlertService } from '../../services/alert.service';
import { ThermalPrinterService } from '../../services/thermal-printer.service';
import { ConfiguracionService, Configuracion } from '../../services/configuracion.service';
import { Router, RouterModule } from '@angular/router';
import { Subscription, interval } from 'rxjs';

type MetodoPago = 'Efectivo' | 'Pago Movil' | 'Binance' | 'Bancolombia' | 'Zelle';

@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DecimalPipe, RouterModule],
  templateUrl: './delivery.component.html',
  styleUrl: './delivery.component.scss'
})
export class DeliveryComponent implements OnInit, OnDestroy {
  deliveryOrders: Order[] = [];
  private socketSubCreated?: Subscription;
  private socketSubUpdated?: Subscription;
  private timerSub?: Subscription;

  // Modal de cobro
  mostrarModalCobro = false;
  cobrando = false;
  metodoPago: MetodoPago = 'Efectivo';
  metodos: MetodoPago[] = ['Efectivo', 'Pago Movil', 'Binance', 'Bancolombia', 'Zelle'];
  metodosIconos: Record<MetodoPago, string> = {
    'Efectivo': '💵',
    'Pago Movil': '📲',
    'Binance': '🟡',
    'Bancolombia': '🏦',
    'Zelle': '💜',
  };
  ordenAProcesar: Order | null = null;
  config: Configuracion | null = null;

  constructor(
    private ordersService: OrdersService,
    private socketService: SocketService,
    private alertService: AlertService,
    public printerService: ThermalPrinterService,
    private configService: ConfiguracionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDeliveries();
    this.setupWebSockets();
    this.loadConfig();
    
    // Actualizar los cronómetros cada minuto
    this.timerSub = interval(60000).subscribe(() => {
      // Forzar detección de cambios si es necesario, 
      // aunque Angular lo hará al actualizar la referencia de la lista si quisiéramos.
      // Aquí solo necesitamos que el pipe o la lógica de la vista se refresque.
    });
  }

  ngOnDestroy(): void {
    this.socketSubCreated?.unsubscribe();
    this.socketSubUpdated?.unsubscribe();
    this.timerSub?.unsubscribe();
  }

  loadDeliveries(): void {
    this.ordersService.getAll().subscribe({
      next: (orders) => {
        // Mostrar pedidos Delivery activos (excluir Entregado, Pagado -legacy- y Cancelado)
        this.deliveryOrders = orders.filter(o =>
          o.orderType === 'Delivery' &&
          o.status !== 'Entregado' &&
          o.status !== 'Pagado' &&
          o.status !== 'Cancelado'
        ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    });
  }

  setupWebSockets(): void {
    this.socketSubCreated = this.socketService.onOrderCreated().subscribe((order: Order) => {
      if (order.orderType === 'Delivery') {
        const exists = this.deliveryOrders.some(o => o._id === order._id);
        if (!exists) {
          this.deliveryOrders.push(order);
          this.deliveryOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          this.alertService.toast('🏍️ Nuevo pedido de delivery');
        }
      }
    });

    this.socketSubUpdated = this.socketService.onOrderUpdated().subscribe((updatedOrder: Order) => {
      if (updatedOrder.orderType === 'Delivery') {
        const index = this.deliveryOrders.findIndex(o => o._id === updatedOrder._id);
        if (index !== -1) {
          // Entregado y Cancelado salen del dashboard
          if (updatedOrder.status === 'Entregado' || updatedOrder.status === 'Cancelado') {
            this.deliveryOrders.splice(index, 1);
          } else {
            // Actualizamos (incluyendo cambios en paymentInfo)
            this.deliveryOrders[index] = updatedOrder;
          }
        } else if (updatedOrder.status !== 'Entregado' && updatedOrder.status !== 'Cancelado') {
          this.deliveryOrders.push(updatedOrder);
          this.deliveryOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
      }
    });
  }

  loadConfig(): void {
    this.configService.get().subscribe((config: Configuracion) => {
      this.config = config;
    });
  }

  getElapsedTime(createdAt: string): number {
    const start = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const diff = now - start;
    return Math.floor(diff / 60000); // Retorna minutos
  }

  getUrgencyClass(createdAt: string): string {
    const minutes = this.getElapsedTime(createdAt);
    if (minutes >= 40) return 'urgency-critical';
    if (minutes >= 20) return 'urgency-warning';
    return 'urgency-normal';
  }

  async updateStatus(order: Order, nextStatus: string): Promise<void> {
    // ── REGLA: Parrillas/Deliveries digitales deben estar pagas antes de ir a cocina ──
    if (nextStatus === 'En Cocina') {
      const isPaid = order.paymentInfo?.status === 'Pagado';
      if (!isPaid) {
        const esCash = await this.alertService.confirm(
          '⚠️ Pedido sin pago registrado',
          'Este pedido no tiene pago confirmado. Los pedidos con Pago Móvil, Zelle o Bancolombia deben cobrarse antes de salir a cocina.\n\n¿Es un pedido en EFECTIVO y debe salir sin pago previo?',
          'Sí, es efectivo — enviar a cocina'
        );
        if (!esCash) return; // User debe usar 💳 para cobrar primero
      }

      // Envío a cocina con comanda de impresión
      const itemsParaCocina = order.items.filter(i => i.requiresKitchen && !i.sentToCocina);
      if (itemsParaCocina.length > 0) {
        if (!this.printerService.conectado()) {
          const continuar = await this.alertService.confirm(
            'Impresora No Conectada',
            '¿Deseas enviar el pedido a cocina de todas formas (sin imprimir)?',
            'Sí, enviar sin imprimir'
          );
          if (!continuar) return;
        }

        this.ordersService.sendToKitchen(order._id).subscribe({
          next: (updatedOrder) => {
            this.alertService.toast(`Pedido #${order.orderNumber} enviado a cocina`);
            if (this.printerService.conectado()) {
              const ordenParcial = { ...updatedOrder, items: itemsParaCocina };
              this.printerService.imprimirComanda(ordenParcial, 'DELIVERY')
                .catch(() => this.alertService.toast(`⚠️ Falla en impresora`, 'warning'));
            } else {
              const ordenParcial = { ...updatedOrder, items: itemsParaCocina };
              this.printerService.verTicketEnConsola(ordenParcial, 'DELIVERY');
              this.alertService.toast(`Ticket generado en consola (Debug)`, 'info');
            }
          },
          error: () => this.alertService.error('Error al enviar a cocina')
        });
        return;
      }
    }

    // Actualización de estado normal
    this.ordersService.updateOrderStatus(order._id, nextStatus).subscribe({
      next: () => this.alertService.toast(`Estado actualizado a: ${nextStatus}`),
      error: () => this.alertService.error('Error al actualizar el estado')
    });
  }

  onAction(order: Order): void {
    const nextStatus = this.getNextStatus(order.status);
    if (!nextStatus) return;

    // Bloquear "Entregado" si el pedido no está pagado
    if (nextStatus === 'Entregado' && order.paymentInfo?.status !== 'Pagado') {
      this.alertService.toast('💳 El pedido debe estar pagado antes de entregarse', 'warning');
      this.abrirModalCobro(order); // Abre el modal de cobro directamente
      return;
    }

    this.updateStatus(order, nextStatus);
  }

  async onCancel(order: Order): Promise<void> {
    const confirm = await this.alertService.confirm(
      'Cancelar Pedido',
      `¿Estás seguro de que deseas cancelar el pedido #${order.orderNumber}?`,
      'Sí, Cancelar'
    );
    
    if (confirm) {
      this.ordersService.cancelOrder(order._id).subscribe({
        next: () => {
          this.alertService.toast(`Pedido #${order.orderNumber} cancelado`);
          this.deliveryOrders = this.deliveryOrders.filter(o => o._id !== order._id);
        },
        error: () => this.alertService.error('Error al cancelar el pedido')
      });
    }
  }

  // ─── Modal de cobro ─────────────────────────────────────────────────────────

  abrirModalCobro(order: Order): void {
    this.ordenAProcesar = order;
    this.metodoPago = 'Efectivo';
    this.mostrarModalCobro = true;
  }

  cerrarModalCobro(): void {
    this.mostrarModalCobro = false;
    this.ordenAProcesar = null;
  }

  confirmarCobro(): void {
    if (!this.ordenAProcesar) return;
    this.cobrando = true;
    this.ordersService.payOrder(this.ordenAProcesar._id, this.metodoPago).subscribe({
      next: (updatedOrder) => {
        // Actualizar la card con el nuevo paymentInfo — NO sacar del dashboard
        const index = this.deliveryOrders.findIndex(o => o._id === updatedOrder._id);
        if (index !== -1) {
          this.deliveryOrders[index] = { ...this.deliveryOrders[index], paymentInfo: updatedOrder.paymentInfo };
        }
        this.cobrando = false;
        this.mostrarModalCobro = false;
        this.ordenAProcesar = null;
        this.alertService.toast('¡Pago registrado! ✅');
      },
      error: () => {
        this.cobrando = false;
        this.alertService.error('Error al registrar el pago.');
      },
    });
  }

  get totalBs(): number {
    if (!this.ordenAProcesar || !this.config) return 0;
    return this.ordenAProcesar.totals.total * this.config.tasaCambioUsdBs;
  }

  get totalCop(): number {
    if (!this.ordenAProcesar || !this.config) return 0;
    return this.ordenAProcesar.totals.total * this.config.tasaCambioUsdCop;
  }

  getNextStatus(currentStatus: string): string | null {
    // Flujo: Recibido → En Cocina → Lista → Entregado
    // (Sin "En Camino" — el domi es externo, no se rastrea)
    const flow: Record<string, string> = {
      'Recibido':  'En Cocina',
      'Abierta':   'En Cocina',
      'En Cocina': 'Lista',
      'Lista':     'Entregado',
    };
    return flow[currentStatus] || null;
  }
}
