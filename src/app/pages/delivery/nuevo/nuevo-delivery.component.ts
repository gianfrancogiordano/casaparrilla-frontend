import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { OrdersService, OrderItem } from '../../../services/orders.service';
import { ProductsService, Product } from '../../../services/products.service';
import { ConfiguracionService, Configuracion } from '../../../services/configuracion.service';
import { AuthService } from '../../../services/auth.service';
import { ClientsService, Client } from '../../../services/clients.service';
import { AlertService } from '../../../services/alert.service';
import { forkJoin } from 'rxjs';

declare const bootstrap: any;

@Component({
  selector: 'app-nuevo-delivery',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './nuevo-delivery.component.html',
  styleUrl: './nuevo-delivery.component.scss',
})
export class NuevoDeliveryComponent implements OnInit {
  @ViewChild('catalogoOffcanvas') catalogoOffcanvasRef!: ElementRef;

  productos: Product[] = [];
  productosFiltrados: Product[] = [];
  config: Configuracion | null = null;
  busqueda = '';
  categorias: string[] = [];
  categoriaActiva = 'Todos';

  cargando = true;
  guardando = false;

  isEditMode = false;
  orderIdToEdit: string | null = null;
  orderNumberToEdit: string | null = null;

  // Carrito de compras local
  items: OrderItem[] = [];

  // Datos Delivery
  customerPhone = '';
  deliveryAddress = '';
  
  // Cliente Vinculado
  mostrarModalCliente = false;
  busquedaCliente = '';
  clientesEncontrados: Client[] = [];
  creandoNuevoCliente = false;
  nuevoCliente: Partial<Client> & { addresses: any[] } = { name: '', phone: '', addresses: [{ type: 'Delivery', street: '', reference: '', isDefault: true }] };
  clienteVinculado: Client | null = null;

  // Modal de producto (cantidad + nota)
  mostrarModalProducto = false;
  productoSeleccionado: Product | null = null;
  cantidadSeleccionada = 1;
  notaSeleccionada = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private ordersService: OrdersService,
    private productsService: ProductsService,
    private configuracionService: ConfiguracionService,
    private authService: AuthService,
    private clientsService: ClientsService,
    private alertService: AlertService,
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.orderIdToEdit = id;
      }
      this.cargarDatos();
    });
  }

  cargarDatos(): void {
    this.cargando = true;
    const reqs: any = {
      productos: this.productsService.getAll(),
      config: this.configuracionService.get(),
    };
    if (this.isEditMode && this.orderIdToEdit) {
      reqs.order = this.ordersService.findOne(this.orderIdToEdit);
    }

    forkJoin(reqs).subscribe({
      next: (results: any) => {
        this.config = results.config;
        this.productos = results.productos.filter((p: any) => p.available);
        this.productosFiltrados = this.productos;

        const cats = [...new Set(this.productos.map((p: Product) => p.category ?? 'Sin categoría').filter(Boolean))] as string[];
        this.categorias = ['Todos', ...cats];

        if (results.order) {
          this.precargarOrden(results.order);
        }

        this.cargando = false;
      },
      error: () => { 
        this.cargando = false; 
        this.alertService.error('Error al cargar datos del sistema.'); 
      },
    });
  }

  precargarOrden(order: any): void {
    this.orderNumberToEdit = order.orderNumber;
    this.items = [...order.items];
    this.customerPhone = order.customerPhone || '';
    this.deliveryAddress = order.deliveryAddress || '';
    if (order.clientId && order.clientId._id) {
      this.clienteVinculado = order.clientId;
    }
  }

  abrirCatalogo(): void {
    const el = this.catalogoOffcanvasRef?.nativeElement;
    if (el) bootstrap.Offcanvas.getOrCreateInstance(el).show();
  }

  cerrarCatalogo(): void {
    const el = this.catalogoOffcanvasRef?.nativeElement;
    if (el) bootstrap.Offcanvas.getOrCreateInstance(el).hide();
  }

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

  abrirModalProducto(producto: Product): void {
    this.cerrarCatalogo();
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
    this.agregarItem(this.productoSeleccionado, this.cantidadSeleccionada, this.notaSeleccionada.trim() || undefined);
    this.mostrarModalProducto = false;
  }

  agregarItem(producto: Product, cantidad = 1, nota?: string): void {
    // Si ya existe el producto con la misma nota, sumar cantidad localmente
    const existingIndex = this.items.findIndex(i => i.productId === producto._id && i.notes === nota);
    
    if (existingIndex >= 0) {
      this.items[existingIndex].quantity += cantidad;
      this.items[existingIndex].subtotal = this.items[existingIndex].quantity * this.items[existingIndex].unitPrice;
    } else {
      this.items.push({
        productId: producto._id,
        productName: producto.name,
        quantity: cantidad,
        unitPrice: producto.sellPrice,
        subtotal: cantidad * producto.sellPrice,
        requiresKitchen: producto.requiresKitchen ?? true,
        notes: nota,
      });
    }
    this.alertService.toast(`✅ ${producto.name} agregado`);
  }

  quitarItem(index: number): void {
    this.items.splice(index, 1);
  }

  get subtotal(): number {
    return this.items.reduce((acc, curr) => acc + curr.subtotal, 0);
  }

  get totalBs(): number {
    if (!this.config) return 0;
    return this.subtotal * this.config.tasaCambioUsdBs;
  }

  get totalCop(): number {
    if (!this.config) return 0;
    return this.subtotal * this.config.tasaCambioUsdCop;
  }

  crearPedidoDelivery(): void {
    if (this.items.length === 0) {
      this.alertService.error('Debes agregar al menos un plato al pedido.');
      return;
    }
    if (!this.clienteVinculado && (!this.customerPhone && !this.deliveryAddress)) {
      this.alertService.error('Se requiere un cliente vinculado o datos de contacto (teléfono/dirección).');
      return;
    }

    this.guardando = true;
    const user = this.authService.getCurrentUser();

    // Payload base (aplica crear o actualizar)
    const payload: any = {
      items: this.items,
      totals: { subtotal: this.subtotal, taxes: 0, total: this.subtotal }
    };

    if (this.clienteVinculado) {
      payload.clientId = this.clienteVinculado._id;
      payload.customerPhone = this.customerPhone || this.clienteVinculado.phone;
      payload.deliveryAddress = this.deliveryAddress || (this.clienteVinculado.addresses?.length ? this.clienteVinculado.addresses[0].street : '');
    } else {
      payload.clientId = null;
      payload.customerPhone = this.customerPhone;
      payload.deliveryAddress = this.deliveryAddress;
    }

    if (this.isEditMode && this.orderIdToEdit) {
      // MODO EDICIÓN
      this.ordersService.updateOrder(this.orderIdToEdit, payload).subscribe({
        next: () => {
          this.guardando = false;
          this.alertService.success('¡Pedido de Delivery actualizado con éxito!');
          this.router.navigate(['/delivery']);
        },
        error: () => {
          this.guardando = false;
          this.alertService.error('Error al actualizar el pedido.');
        }
      });
    } else {
      // MODO CREACIÓN
      payload.orderNumber = `DEL-${Date.now()}`;
      payload.status = 'Recibido';
      payload.orderType = 'Delivery';
      payload.table = 'WhatsApp';
      payload.waiterId = user?.id;

      this.ordersService.createOrder(payload).subscribe({
        next: () => {
          this.guardando = false;
          this.alertService.success('¡Pedido de Delivery creado con éxito!');
          this.router.navigate(['/delivery']);
        },
        error: () => {
          this.guardando = false;
          this.alertService.error('Error al crear el pedido.');
        }
      });
    }
  }

  // --- Manejo de Clientes VIP ---
  abrirModalCliente(): void {
    this.busquedaCliente = '';
    this.clientesEncontrados = [];
    this.creandoNuevoCliente = false;
    this.nuevoCliente = { name: '', phone: '', addresses: [{ type: 'Delivery', street: '', reference: '', isDefault: true }] };
    this.mostrarModalCliente = true;
  }

  buscarCliente(): void {
    const term = this.busquedaCliente.trim().toLowerCase();
    if (term.length < 3) {
      this.clientesEncontrados = [];
      return;
    }
    this.clientsService.getAll().subscribe((data: Client[]) => {
      this.clientesEncontrados = data.filter((c: Client) =>
        c.name.toLowerCase().includes(term) || (c.phone && c.phone.includes(term))
      );
    });
  }

  vincularCliente(cliente: Client): void {
    this.clienteVinculado = cliente;
    this.customerPhone = cliente.phone || '';
    this.deliveryAddress = cliente.addresses && cliente.addresses.length > 0 ? cliente.addresses[0].street : '';
    this.mostrarModalCliente = false;
    this.alertService.toast('👤 Cliente vinculado con éxito');
  }

  crearYVincularCliente(): void {
    if (!this.nuevoCliente.name || !this.nuevoCliente.phone) return;
    this.guardando = true;
    this.clientsService.create(this.nuevoCliente as any).subscribe({
      next: (cliente: Client) => {
        this.guardando = false;
        this.vincularCliente(cliente);
      },
      error: () => {
        this.guardando = false;
        this.alertService.error('Error al crear el cliente.');
      }
    });
  }

  desvincularCliente(): void {
    this.clienteVinculado = null;
    this.customerPhone = '';
    this.deliveryAddress = '';
  }

  volver(): void {
    this.router.navigate(['/delivery']);
  }
}
