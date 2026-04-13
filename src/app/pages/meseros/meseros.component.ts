import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ConfiguracionService, Configuracion } from '../../services/configuracion.service';
import { OrdersService, Order } from '../../services/orders.service';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { Subscription, forkJoin, map, of, catchError } from 'rxjs';

export interface MesaState {
  numero: number;
  label: string;
  orden: Order | null;
  cargando: boolean;
}

@Component({
  selector: 'app-meseros',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './meseros.component.html',
  styleUrl: './meseros.component.scss',
})
export class MeserosComponent implements OnInit, OnDestroy {
  config: Configuracion | null = null;
  mesas: MesaState[] = [];
  cargando = true;
  error = '';
  
  // Delivery
  pendingDeliveriesCount = 0;
  private socketSubCreated?: Subscription;
  private socketSubUpdated?: Subscription;

  constructor(
    private configuracionService: ConfiguracionService,
    private ordersService: OrdersService,
    private socketService: SocketService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.cargarMesas();
    this.cargarDeliveries();
    this.setupWebSockets();
  }

  ngOnDestroy(): void {
    this.socketSubCreated?.unsubscribe();
    this.socketSubUpdated?.unsubscribe();
  }

  cargarMesas(): void {
    this.cargando = true;
    this.configuracionService.get().subscribe({
      next: (config) => {
        this.config = config;
        const total = config.cantidadMesas;

        // Crear la grilla de mesas
        this.mesas = Array.from({ length: total }, (_, i) => ({
          numero: i + 1,
          label: `Mesa ${i + 1}`,
          orden: null,
          cargando: true,
        }));

        // Consultar el estado de cada mesa en paralelo
        const checks$ = this.mesas.map((mesa) =>
          this.ordersService.getOpenOrderByTable(String(mesa.numero)).pipe(
            map((orden) => ({ mesaNum: mesa.numero, orden })),
            catchError(() => of({ mesaNum: mesa.numero, orden: null })),
          ),
        );

        forkJoin(checks$).subscribe({
          next: (results) => {
            results.forEach(({ mesaNum, orden }) => {
              const m = this.mesas.find((x) => x.numero === mesaNum);
              if (m) { m.orden = orden; m.cargando = false; }
            });
            this.cargando = false;
          },
          error: () => { this.cargando = false; },
        });
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Error al cargar la configuración.';
        this.cargando = false;
      },
    });
  }

  abrirMesa(mesa: MesaState): void {
    this.router.navigate(['/mesas', mesa.numero]);
  }

  goToDelivery(): void {
    this.router.navigate(['/delivery']);
  }

  getMesaStatus(mesa: MesaState): 'libre' | 'ocupada' {
    return mesa.orden ? 'ocupada' : 'libre';
  }

  // --- Delivery Tracking ---
  cargarDeliveries(): void {
    this.ordersService.getAll().subscribe({
      next: (orders) => {
        this.pendingDeliveriesCount = orders.filter(o => 
          o.orderType === 'Delivery' && 
          o.status !== 'Pagado' && 
          o.status !== 'Entregado' &&
          o.status !== 'Cancelado'
        ).length;
      }
    });
  }

  setupWebSockets(): void {
    this.socketSubCreated = this.socketService.onOrderCreated().subscribe((newOrder: Order) => {
      if (newOrder.orderType === 'Delivery') {
        this.pendingDeliveriesCount++;
      }
    });

    this.socketSubUpdated = this.socketService.onOrderUpdated().subscribe((updatedOrder: Order) => {
      // Reload count fully on update to be safe and accurate
      if (updatedOrder.orderType === 'Delivery') {
        this.cargarDeliveries();
      }
    });
  }
}
