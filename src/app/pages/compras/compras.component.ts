import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PurchasesService, Supplier, PurchaseOrder, PurchaseItem, PurchaseSummary } from '../../services/purchases.service';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Ingredient {
  _id: string;
  name: string;
  unitMeasure: string;
  unitCost: number;
  currentStock: number;
}

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './compras.component.html',
  styleUrl: './compras.component.scss'
})
export class ComprasComponent implements OnInit {
  // Data
  suppliers: Supplier[] = [];
  purchases: PurchaseOrder[] = [];
  purchasesFiltradas: PurchaseOrder[] = [];
  ingredients: Ingredient[] = [];
  summary: PurchaseSummary | null = null;

  // Vistas
  vistaActiva: 'compras' | 'proveedores' = 'compras';

  // Filtros
  filtroStatus = '';
  filtroBusqueda = '';
  filtroDesde = '';
  filtroHasta = '';

  // Modal Proveedor
  mostrarModalProveedor = false;
  editandoProveedor = false;
  formProveedor: Partial<Supplier> = this.getEmptySupplier();

  // Modal Compra
  mostrarModalCompra = false;
  editandoCompra = false;
  formCompra: any = this.getEmptyPurchase();

  // Detalle
  mostrarDetalle = false;
  compraDetalle: PurchaseOrder | null = null;

  constructor(
    private purchasesService: PurchasesService,
    private alertService: AlertService,
    public authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.setMesActual();
    this.cargarProveedores();
    this.cargarIngredientes();
  }

  // ── Carga de datos ──────────────────────────────────────────────────

  cargarProveedores(): void {
    this.purchasesService.getSuppliers().subscribe({
      next: (data) => this.suppliers = data
    });
  }

  cargarCompras(): void {
    this.purchasesService.getPurchases().subscribe({
      next: (data) => {
        this.purchases = data;
        this.aplicarFiltros();
      }
    });
    this.cargarSummary();
  }

  cargarSummary(): void {
    this.purchasesService.getSummary(this.filtroDesde, this.filtroHasta).subscribe({
      next: (data) => this.summary = data
    });
  }

  cargarIngredientes(): void {
    this.http.get<Ingredient[]>(`${environment.apiUrl}/ingredients`).subscribe({
      next: (data) => this.ingredients = data
    });
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
    this.cargarCompras();
  }

  aplicarFiltros(): void {
    let resultado = [...this.purchases];

    if (this.filtroStatus) {
      resultado = resultado.filter(p => p.status === this.filtroStatus);
    }

    if (this.filtroBusqueda.trim()) {
      const term = this.filtroBusqueda.toLowerCase();
      resultado = resultado.filter(p =>
        (p.supplierId?.name || '').toLowerCase().includes(term) ||
        p.items.some(i => i.ingredientName.toLowerCase().includes(term))
      );
    }

    if (this.filtroDesde) {
      const desdeTime = new Date(`${this.filtroDesde}T00:00:00-04:00`).getTime();
      resultado = resultado.filter(p => new Date(p.date).getTime() >= desdeTime);
    }

    if (this.filtroHasta) {
      const hastaTime = new Date(`${this.filtroHasta}T23:59:59-04:00`).getTime();
      resultado = resultado.filter(p => new Date(p.date).getTime() <= hastaTime);
    }

    this.purchasesFiltradas = resultado;
  }

  // ── Proveedores CRUD ──────────────────────────────────────────────

  abrirModalProveedor(supplier?: Supplier): void {
    if (supplier) {
      this.editandoProveedor = true;
      this.formProveedor = { ...supplier };
    } else {
      this.editandoProveedor = false;
      this.formProveedor = this.getEmptySupplier();
    }
    this.mostrarModalProveedor = true;
  }

  cerrarModalProveedor(): void {
    this.mostrarModalProveedor = false;
  }

  guardarProveedor(): void {
    if (this.editandoProveedor && this.formProveedor._id) {
      this.purchasesService.updateSupplier(this.formProveedor._id, this.formProveedor).subscribe({
        next: () => {
          this.alertService.toast('Proveedor actualizado');
          this.cargarProveedores();
          this.cerrarModalProveedor();
        },
        error: () => this.alertService.error('Error al actualizar proveedor')
      });
    } else {
      this.purchasesService.createSupplier(this.formProveedor).subscribe({
        next: () => {
          this.alertService.success('Proveedor registrado');
          this.cargarProveedores();
          this.cerrarModalProveedor();
        },
        error: () => this.alertService.error('Error al crear proveedor')
      });
    }
  }

  async eliminarProveedor(supplier: Supplier): Promise<void> {
    const confirmar = await this.alertService.confirm(
      'Eliminar Proveedor',
      `¿Eliminar "${supplier.name}"?`,
      'Sí, eliminar'
    );
    if (confirmar) {
      this.purchasesService.deleteSupplier(supplier._id).subscribe({
        next: () => {
          this.alertService.toast('Proveedor eliminado');
          this.cargarProveedores();
        },
        error: () => this.alertService.error('No se pudo eliminar')
      });
    }
  }

  // ── Compras CRUD ──────────────────────────────────────────────────

  abrirModalCompra(): void {
    this.editandoCompra = false;
    this.formCompra = this.getEmptyPurchase();
    this.mostrarModalCompra = true;
  }

  cerrarModalCompra(): void {
    this.mostrarModalCompra = false;
  }

  agregarItem(): void {
    this.formCompra.items.push({
      ingredientId: '',
      ingredientName: '',
      quantity: 0,
      unitMeasure: '',
      unitCost: 0,
      subtotal: 0
    });
  }

  quitarItem(index: number): void {
    this.formCompra.items.splice(index, 1);
    this.calcularTotalCompra();
  }

  onIngredientSelected(item: any): void {
    const ing = this.ingredients.find(i => i._id === item.ingredientId);
    if (ing) {
      item.ingredientName = ing.name;
      item.unitMeasure = ing.unitMeasure;
      item.unitCost = ing.unitCost;
      this.calcularSubtotal(item);
    }
  }

  calcularSubtotal(item: any): void {
    item.subtotal = Math.round(item.quantity * item.unitCost * 100) / 100;
    this.calcularTotalCompra();
  }

  calcularTotalCompra(): void {
    this.formCompra.total = this.formCompra.items.reduce((sum: number, i: any) => sum + (i.subtotal || 0), 0);
  }

  guardarCompra(): void {
    const user = this.authService.getCurrentUser();
    this.formCompra.createdBy = user?.id;

    this.purchasesService.createPurchase(this.formCompra).subscribe({
      next: () => {
        this.alertService.success('Orden de compra creada');
        this.cargarCompras();
        this.cerrarModalCompra();
      },
      error: () => this.alertService.error('Error al crear orden')
    });
  }

  async confirmarCompra(compra: PurchaseOrder): Promise<void> {
    const confirmar = await this.alertService.confirm(
      'Confirmar Compra',
      `¿Confirmar la compra por ${compra.total.toFixed(2)} USD?\nEsto actualizará el inventario automáticamente.`,
      'Sí, confirmar'
    );
    if (confirmar) {
      this.purchasesService.confirmPurchase(compra._id).subscribe({
        next: () => {
          this.alertService.success('✅ Compra confirmada — Inventario actualizado');
          this.cargarCompras();
        },
        error: (err) => this.alertService.error(err?.error?.message || 'Error al confirmar')
      });
    }
  }

  async cancelarCompra(compra: PurchaseOrder): Promise<void> {
    const confirmar = await this.alertService.confirm(
      'Cancelar Compra',
      `¿Cancelar esta orden de compra?`,
      'Sí, cancelar'
    );
    if (confirmar) {
      this.purchasesService.cancelPurchase(compra._id).subscribe({
        next: () => {
          this.alertService.toast('Compra cancelada');
          this.cargarCompras();
        },
        error: (err) => this.alertService.error(err?.error?.message || 'Error al cancelar')
      });
    }
  }

  async eliminarCompra(compra: PurchaseOrder): Promise<void> {
    const confirmar = await this.alertService.confirm(
      'Eliminar Compra',
      `¿Eliminar esta orden de compra?`,
      'Sí, eliminar'
    );
    if (confirmar) {
      this.purchasesService.deletePurchase(compra._id).subscribe({
        next: () => {
          this.alertService.toast('Compra eliminada');
          this.cargarCompras();
        }
      });
    }
  }

  verDetalle(compra: PurchaseOrder): void {
    this.compraDetalle = compra;
    this.mostrarDetalle = true;
  }

  cerrarDetalle(): void {
    this.mostrarDetalle = false;
    this.compraDetalle = null;
  }

  // ── Helpers ────────────────────────────────────────────────────────

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Pendiente': 'status-pendiente',
      'Confirmada': 'status-confirmada',
      'Cancelada': 'status-cancelada'
    };
    return map[status] || '';
  }

  getStatusIcon(status: string): string {
    const map: Record<string, string> = {
      'Pendiente': '🕐', 'Confirmada': '✅', 'Cancelada': '❌'
    };
    return map[status] || '';
  }

  getSupplierName(supplier: any): string {
    return supplier?.name || 'Sin proveedor';
  }

  private getEmptySupplier(): Partial<Supplier> {
    return {
      name: '',
      phone: '',
      email: '',
      contactPerson: '',
      address: '',
      ingredientsSupplied: [],
      notes: '',
      active: true
    };
  }

  private getEmptyPurchase(): any {
    const hoy = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Caracas',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
    return {
      supplierId: '',
      date: hoy,
      items: [{ ingredientId: '', ingredientName: '', quantity: 0, unitMeasure: '', unitCost: 0, subtotal: 0 }],
      total: 0,
      notes: ''
    };
  }
}
