import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrdersService, Order } from '../../services/orders.service';
import { SocketService } from '../../services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cocina',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cocina.component.html',
  styleUrl: './cocina.component.scss',
})
export class CocinaComponent implements OnInit, OnDestroy {
  pedidos: Order[] = [];
  cargando = true;
  now = Date.now();

  private timerInterval: any;
  private subs = new Subscription();

  constructor(
    private ordersService: OrdersService,
    private socketService: SocketService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargarPedidos();
    this.setupSockets();
    // Update timers every second
    this.timerInterval = setInterval(() => {
      this.now = Date.now();
      this.cdr.markForCheck();
    }, 1000);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    clearInterval(this.timerInterval);
  }

  cargarPedidos(): void {
    this.cargando = true;
    this.ordersService.getAll().subscribe({
      next: (orders) => {
        this.pedidos = orders.filter(
          (o) => o.status === 'En Cocina' && this.tieneItemsKitchen(o),
        );
        this.cargando = false;
      },
      error: () => { this.cargando = false; },
    });
  }

  setupSockets(): void {
    this.subs.add(
      this.socketService.onKitchenNewOrder().subscribe((order: Order) => {
        if (!this.tieneItemsKitchen(order)) return;
        const idx = this.pedidos.findIndex((p) => p._id === order._id);
        if (idx >= 0) {
          // Replace existing
          const updated = [...this.pedidos];
          updated[idx] = order;
          this.pedidos = updated;
        } else {
          // Add new — use spread so Angular detects the new array reference
          this.pedidos = [...this.pedidos, order];
        }
        this.sortPedidos();
        this.cdr.detectChanges();
      }),
    );

    this.subs.add(
      this.socketService.onKitchenOrderUpdated().subscribe((order: Order) => {
        this.pedidos = this.pedidos.filter((p) => p._id !== order._id);
        this.cdr.detectChanges();
      }),
    );

    // Also react to general order_updated (e.g. if cancelled)
    this.subs.add(
      this.socketService.onOrderUpdated().subscribe((order: Order) => {
        if (order.status !== 'En Cocina') {
          this.pedidos = this.pedidos.filter((p) => p._id !== order._id);
          this.cdr.detectChanges();
        }
      }),
    );
  }

  marcarListo(order: Order): void {
    this.ordersService.updateOrder(order._id, { status: 'Listo' }).subscribe({
      next: () => {
        this.pedidos = this.pedidos.filter((p) => p._id !== order._id);
      },
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  tieneItemsKitchen(order: Order): boolean {
    return order.items.some((i) => i.requiresKitchen);
  }

  itemsKitchen(order: Order) {
    return order.items.filter((i) => i.requiresKitchen);
  }

  /** Elapsed seconds since kitchenSentAt */
  elapsedSeconds(order: Order): number {
    const sentAt = (order as any).kitchenSentAt;
    if (!sentAt) return 0;
    return Math.floor((this.now - new Date(sentAt).getTime()) / 1000);
  }

  formatElapsed(order: Order): string {
    const sec = this.elapsedSeconds(order);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  urgencyClass(order: Order): string {
    const sec = this.elapsedSeconds(order);
    if (sec > 20 * 60) return 'urgent';
    if (sec > 10 * 60) return 'warning';
    return 'normal';
  }

  orderLabel(order: Order): string {
    if ((order as any).orderType === 'Delivery') {
      return `🛵 ${(order as any).orderNumber}`;
    }
    const table = (order as any).table || (order as any).tableNumber;
    return `🪑 Mesa ${table}`;
  }

  private sortPedidos(): void {
    this.pedidos.sort((a, b) => {
      const aAt = (a as any).kitchenSentAt ? new Date((a as any).kitchenSentAt).getTime() : 0;
      const bAt = (b as any).kitchenSentAt ? new Date((b as any).kitchenSentAt).getTime() : 0;
      return aAt - bAt; // oldest first
    });
  }
}
