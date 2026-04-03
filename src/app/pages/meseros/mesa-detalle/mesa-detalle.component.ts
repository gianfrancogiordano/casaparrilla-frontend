import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OrdersService, Order, OrderItem } from '../../../services/orders.service';
import { ProductsService, Product } from '../../../services/products.service';
import { ConfiguracionService, Configuracion } from '../../../services/configuracion.service';
import { AuthService } from '../../../services/auth.service';
import { ThermalPrinterService } from '../../../services/thermal-printer.service';
import { ClientsService, Client } from '../../../services/clients.service';
import { AlertService } from '../../../services/alert.service';
import { forkJoin } from 'rxjs';

// Bootstrap JS (disponible globalmente via angular.json scripts)
declare const bootstrap: any;

type MetodoPago = 'Efectivo' | 'Pago Movil' | 'Binance' | 'Bancolombia' | 'Zelle';

@Component({
  selector: 'app-mesa-detalle',
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './mesa-detalle.component.html',
  styleUrl: './mesa-detalle.component.scss',
})
export class MesaDetalleComponent implements OnInit {
  @ViewChild('catalogoOffcanvas') catalogoOffcanvasRef!: ElementRef;

  mesaNumero = '';
  orden: Order | null = null;
  productos: Product[] = [];
  productosFiltrados: Product[] = [];
  config: Configuracion | null = null;
  busqueda = '';
  categorias: string[] = [];
  categoriaActiva = 'Todos';

  cargando = true;
  guardando = false;
  cobrando = false;
  liberando = false;
  mostrarModalLiberar = false;

  // Modal de producto (cantidad + nota)
  mostrarModalProducto = false;
  productoSeleccionado: Product | null = null;
  cantidadSeleccionada = 1;
  notaSeleccionada = '';

  // Modal de cobro
  mostrarModalCobro = false;
  metodoPago: MetodoPago = 'Efectivo';
  metodos: MetodoPago[] = ['Efectivo', 'Pago Movil', 'Binance', 'Bancolombia', 'Zelle'];
  metodosIconos: Record<MetodoPago, string> = {
    'Efectivo': '💵',
    'Pago Movil': '📲',
    'Binance': '🟡',
    'Bancolombia': '🏦',
    'Zelle': '💜',
  };

  // Gestión de Clientes VIP
  mostrarModalCliente = false;
  busquedaCliente = '';
  clientesEncontrados: Client[] = [];
  creandoNuevoCliente = false;
  nuevoCliente = { name: '', phone: '' };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ordersService: OrdersService,
    private productsService: ProductsService,
    private configuracionService: ConfiguracionService,
    private authService: AuthService,
    public printerService: ThermalPrinterService,
    private clientsService: ClientsService,
    private alertService: AlertService,
  ) { }

  ngOnInit(): void {
    this.mesaNumero = this.route.snapshot.paramMap.get('numero') ?? '1';
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    forkJoin({
      orden: this.ordersService.getOpenOrderByTable(this.mesaNumero),
      productos: this.productsService.getAll(),
      config: this.configuracionService.get(),
    }).subscribe({
      next: ({ orden, productos, config }) => {
        this.orden = orden;
        this.config = config;
        this.productos = productos.filter((p) => p.available);
        this.productosFiltrados = this.productos;

        const cats = [...new Set(productos.map((p) => p.category ?? 'Sin categoría').filter(Boolean))];
        this.categorias = ['Todos', ...cats];

        this.cargando = false;
      },
      error: () => { this.cargando = false; this.alertService.error('Error al cargar datos del sistema.'); },
    });
  }

  // ─── Catálogo Offcanvas ─────────────────────────────────────────────────────

  abrirCatalogo(): void {
    const el = this.catalogoOffcanvasRef?.nativeElement;
    if (el) bootstrap.Offcanvas.getOrCreateInstance(el).show();
  }

  cerrarCatalogo(): void {
    const el = this.catalogoOffcanvasRef?.nativeElement;
    if (el) bootstrap.Offcanvas.getOrCreateInstance(el).hide();
  }

  // ─── Filtros ────────────────────────────────────────────────────────────────

  filtrarCategoria(cat: string): void {
    this.categoriaActiva = cat;
    this.aplicarFiltros();
  }

  onBusqueda(): void { this.aplicarFiltros(); }

  aplicarFiltros(): void {
    let lista = this.productos;
    if (this.categoriaActiva !== 'Todos') {
      lista = lista.filter((p) => (p.category ?? 'Sin categoría') === this.categoriaActiva);
    }
    if (this.busqueda.trim()) {
      lista = lista.filter((p) => p.name.toLowerCase().includes(this.busqueda.toLowerCase()));
    }
    this.productosFiltrados = lista;
  }

  // ─── Mini-modal de producto ─────────────────────────────────────────────────

  abrirModalProducto(producto: Product): void {
    // Cerrar el offcanvas ANTES de abrir el modal para que el input
    // de búsqueda no robe el foco al textarea de la nota.
    this.cerrarCatalogo();

    // Pequeño delay para que el offcanvas termine de cerrarse
    setTimeout(() => {
      this.productoSeleccionado = producto;
      this.cantidadSeleccionada = 1;
      this.notaSeleccionada = '';
      this.mostrarModalProducto = true;
    }, 200);
  }

  cerrarModalProducto(): void {
    this.mostrarModalProducto = false;
    this.productoSeleccionado = null;
  }

  confirmarAgregarProducto(): void {
    if (!this.productoSeleccionado) return;
    this.mostrarModalProducto = false;
    this.agregarProducto(this.productoSeleccionado, this.cantidadSeleccionada, this.notaSeleccionada.trim() || undefined);
  }

  // ─── Agregar / Quitar items ──────────────────────────────────────────────────

  agregarProducto(producto: Product, cantidad = 1, nota?: string): void {
    const user = this.authService.getCurrentUser();
    this.guardando = true;

    const item: Partial<OrderItem> = {
      productId: producto._id,
      productName: producto.name,
      quantity: cantidad,
      unitPrice: producto.sellPrice,
      subtotal: cantidad * producto.sellPrice,
      requiresKitchen: producto.requiresKitchen ?? true,
      notes: nota,
    };

    const onSuccess = (orden: Order) => {
      this.orden = orden;
      this.guardando = false;
      this.alertService.toast(`✅ ${producto.name} agregado`);
      this.cerrarCatalogo(); // ← cierra el offcanvas automáticamente
    };

    if (!this.orden) {
      const payload = {
        orderNumber: `ORD-${Date.now()}`,
        status: 'Abierta',
        orderType: 'Mesa',
        table: this.mesaNumero,
        waiterId: user?.id,
        items: [{ ...item, subtotal: item.subtotal! }] as OrderItem[],
        totals: { subtotal: item.subtotal!, taxes: 0, total: item.subtotal! },
      };
      this.ordersService.createOrder(payload as any).subscribe({
        next: onSuccess,
        error: () => { this.guardando = false; this.alertService.error('Error al crear la orden.'); },
      });
    } else {
      this.ordersService.addItemToOrder(this.orden._id, item).subscribe({
        next: onSuccess,
        error: () => { this.guardando = false; this.alertService.error('Error al agregar el producto.'); },
      });
    }
  }

  quitarItem(index: number): void {
    if (!this.orden) return;
    this.guardando = true;
    this.ordersService.removeItemFromOrder(this.orden._id, index).subscribe({
      next: (orden) => { this.orden = orden; this.guardando = false; },
      error: () => { this.guardando = false; },
    });
  }

  // ─── Modal de cobro ─────────────────────────────────────────────────────────

  abrirModalCobro(): void {
    this.metodoPago = 'Efectivo';
    this.mostrarModalCobro = true;
  }

  cerrarModalCobro(): void {
    this.mostrarModalCobro = false;
  }

  confirmarCobro(): void {
    if (!this.orden) return;
    this.cobrando = true;
    this.ordersService.payOrder(this.orden._id, this.metodoPago).subscribe({
      next: () => {
        this.cobrando = false;
        this.mostrarModalCobro = false;
        this.alertService.success('¡Pago registrado! Mesa liberada.');
        setTimeout(() => this.router.navigate(['/meseros']), 1200);
      },
      error: () => { this.cobrando = false; this.alertService.error('Error al registrar el pago.'); },
    });
  }

  // ── Getter: ítems pendientes de envío a cocina ──────────────────────────────

  get itemsPendientesCocina(): OrderItem[] {
    if (!this.orden) return [];
    return this.orden.items.filter(i => i.requiresKitchen && !i.sentToCocina);
  }

  // ─── Enviar a cocina (rondas) ───────────────────────────────────────────────

  async enviarACocina(): Promise<void> {
    if (!this.orden) return;
    const pendientes = this.itemsPendientesCocina;
    if (pendientes.length === 0) return;

    // VERIFICACIÓN DE IMPRESORA ANTES DE ENVIAR
    if (!this.printerService.conectado()) {
      const continuar = await this.alertService.confirm('Impresora No Conectada', '¿Deseas enviar el pedido a cocina de todas formas (sin imprimir)?', 'Sí, enviar sin imprimir');
      if (!continuar) return;
    }

    this.guardando = true;
    this.ordersService.sendToKitchen(this.orden._id).subscribe({
      next: (orden) => {
        this.orden = orden;
        this.guardando = false;
        // Imprimir solo los ítems de esta ronda si la impresora está disponible
        if (this.printerService.conectado()) {
          const ordenParcial = { ...orden, items: pendientes };
          this.printerService.imprimirComanda(ordenParcial, this.mesaNumero)
            .then(() => this.alertService.toast(`🍳 ${pendientes.length} item(s) enviados a cocina`, 'success'))
            .catch(() => this.alertService.toast(`⚠️ Falla en impresora`, 'warning'));
        } else {
          this.alertService.toast(`🍳 ${pendientes.length} item(s) enviados (sin impresión)`, 'info');
        }
      },
      error: () => { this.guardando = false; this.alertService.error('Error al enviar a cocina.'); },
    });
  }

  // ─── Liberar mesa (orden vacía) ─────────────────────────────────────────────

  get mostrarBotonLiberar(): boolean {
    return !!this.orden && this.orden.items.length === 0;
  }

  abrirModalLiberar(): void { this.mostrarModalLiberar = true; }
  cerrarModalLiberar(): void { this.mostrarModalLiberar = false; }

  confirmarLiberar(): void {
    if (!this.orden) return;
    this.liberando = true;
    this.ordersService.cancelOrder(this.orden._id).subscribe({
      next: () => {
        this.liberando = false;
        this.mostrarModalLiberar = false;
        setTimeout(() => this.router.navigate(['/meseros']), 1200);
      },
      error: () => {
        this.liberando = false;
        this.alertService.error('Error al liberar la mesa. Intenta nuevamente.');
      },
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  get totalBs(): number {
    if (!this.orden || !this.config) return 0;
    return this.orden.totals.total * this.config.tasaCambioUsdBs;
  }

  get totalCop(): number {
    if (!this.orden || !this.config) return 0;
    return this.orden.totals.total * this.config.tasaCambioUsdCop;
  }

  // ─── Clientes VIP ───────────────────────────────────────────────────────────

  abrirModalCliente(): void {
    this.busquedaCliente = '';
    this.clientesEncontrados = [];
    this.creandoNuevoCliente = false;
    this.nuevoCliente = { name: '', phone: '' };
    this.mostrarModalCliente = true;
  }

  buscarCliente(): void {
    const term = this.busquedaCliente.trim().toLowerCase();
    if (term.length < 3) {
      this.clientesEncontrados = [];
      return;
    }
    this.clientsService.getAll().subscribe(data => {
      this.clientesEncontrados = data.filter(c =>
        c.name.toLowerCase().includes(term) || (c.phone && c.phone.includes(term))
      );
    });
  }

  vincularCliente(clienteId: string): void {
    if (!this.orden) return;
    this.ordersService.linkClientToOrder(this.orden._id, clienteId).subscribe({
      next: (orden) => {
        this.orden = orden;
        this.mostrarModalCliente = false;
        this.alertService.toast('👤 Cliente vinculado con éxito');
      },
      error: () => this.alertService.error('Error al vincular el cliente.')
    });
  }

  crearYVincularCliente(): void {
    if (!this.nuevoCliente.name || !this.nuevoCliente.phone) return;
    this.clientsService.create(this.nuevoCliente).subscribe({
      next: (cliente) => {
        this.vincularCliente(cliente._id);
      },
      error: () => this.alertService.error('Error al crear el cliente.')
    });
  }

  get clienteVinculadoNombre(): string | null {
    if (!this.orden || !this.orden.clientId) return null;
    // Si el backend popula el cliente, lo mostramos. Si no, mostramos "Cliente VIP"
    if (typeof this.orden.clientId === 'object') {
      return (this.orden.clientId as any).name;
    }
    return 'Cliente VIP';
  }

  volver(): void { this.router.navigate(['/meseros']); }
}
