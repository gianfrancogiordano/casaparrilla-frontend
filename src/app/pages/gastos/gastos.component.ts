import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpensesService, Expense, ExpenseSummary } from '../../services/expenses.service';
import { FixedExpensesService, FixedExpense } from '../../services/fixed-expenses.service';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-gastos',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './gastos.component.html',
  styleUrl: './gastos.component.scss'
})
export class GastosComponent implements OnInit {

  // ── Estado de tabs ────────────────────────────────────────────────
  tabActiva: 'variables' | 'fijos' = 'variables';

  // ── Gastos Variables ──────────────────────────────────────────────
  gastos: Expense[] = [];
  gastosFiltrados: Expense[] = [];
  summary: ExpenseSummary | null = null;
  categorias: string[];

  filtroCategoria = '';
  filtroBusqueda  = '';
  filtroDesde     = '';
  filtroHasta     = '';

  mostrarModalVariable = false;
  editandoVariable     = false;
  formVariable: Partial<Expense> = this.getEmptyFormVariable();

  // ── Gastos Fijos ──────────────────────────────────────────────────
  gastosFijos: FixedExpense[] = [];
  totalFijosActivos = 0;

  mostrarModalFijo = false;
  editandoFijo     = false;
  formFijo: Partial<FixedExpense> = this.getEmptyFormFijo();

  constructor(
    private expensesService: ExpensesService,
    public  fixedExpensesService: FixedExpensesService,
    private alertService: AlertService,
    public  authService: AuthService
  ) {
    this.categorias = this.expensesService.getCategories();
  }

  ngOnInit(): void {
    this.setMesActual();
    this.cargarFijos();
  }

  // ── Tab ────────────────────────────────────────────────────────────

  setTab(tab: 'variables' | 'fijos'): void {
    this.tabActiva = tab;
  }

  // ══════════════════════════════════════════════════════════════════
  // GASTOS VARIABLES
  // ══════════════════════════════════════════════════════════════════

  cargarGastos(): void {
    this.expensesService.getAll().subscribe({
      next: (data) => {
        this.gastos = data;
        this.aplicarFiltros();
      }
    });
    this.cargarSummary();
  }

  cargarSummary(): void {
    this.expensesService.getSummary(this.filtroDesde, this.filtroHasta).subscribe({
      next: (data) => this.summary = data
    });
  }

  aplicarFiltros(): void {
    let resultado = [...this.gastos];

    if (this.filtroCategoria) {
      resultado = resultado.filter(g => g.category === this.filtroCategoria);
    }

    if (this.filtroBusqueda.trim()) {
      const term = this.filtroBusqueda.toLowerCase();
      resultado = resultado.filter(g =>
        g.description.toLowerCase().includes(term) ||
        g.category.toLowerCase().includes(term)
      );
    }

    if (this.filtroDesde) {
      const desdeTime = new Date(`${this.filtroDesde}T00:00:00-04:00`).getTime();
      resultado = resultado.filter(g => new Date(g.date).getTime() >= desdeTime);
    }

    if (this.filtroHasta) {
      const hastaTime = new Date(`${this.filtroHasta}T23:59:59-04:00`).getTime();
      resultado = resultado.filter(g => new Date(g.date).getTime() <= hastaTime);
    }

    this.gastosFiltrados = resultado;
  }

  setMesActual(): void {
    const hoy   = new Date();
    const year  = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    this.filtroDesde = `${year}-${month}-01`;
    this.filtroHasta = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Caracas',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(hoy);
    this.cargarGastos();
  }

  limpiarFiltros(): void {
    this.filtroCategoria = '';
    this.filtroBusqueda  = '';
    this.setMesActual();
  }

  // Modal variable
  abrirModalVariable(gasto?: Expense): void {
    if (gasto) {
      this.editandoVariable = true;
      this.formVariable = { ...gasto, date: gasto.date?.substring(0, 10) };
    } else {
      this.editandoVariable = false;
      this.formVariable = this.getEmptyFormVariable();
    }
    this.mostrarModalVariable = true;
  }

  cerrarModalVariable(): void { this.mostrarModalVariable = false; }

  guardarVariable(): void {
    if (this.editandoVariable && this.formVariable._id) {
      this.expensesService.update(this.formVariable._id, this.formVariable).subscribe({
        next: () => { this.alertService.toast('Gasto actualizado'); this.cargarGastos(); this.cerrarModalVariable(); },
        error: () => this.alertService.error('Error al actualizar')
      });
    } else {
      this.expensesService.create(this.formVariable).subscribe({
        next: () => { this.alertService.success('Gasto registrado'); this.cargarGastos(); this.cerrarModalVariable(); },
        error: () => this.alertService.error('Error al crear gasto')
      });
    }
  }

  async eliminarGasto(gasto: Expense): Promise<void> {
    const confirmar = await this.alertService.confirm(
      'Eliminar Gasto',
      `¿Eliminar "${gasto.description}" por ${gasto.amount.toFixed(2)} USD?`,
      'Sí, eliminar'
    );
    if (confirmar) {
      this.expensesService.delete(gasto._id).subscribe({
        next: () => { this.alertService.toast('Gasto eliminado'); this.cargarGastos(); },
        error: () => this.alertService.error('No se pudo eliminar')
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // GASTOS FIJOS
  // ══════════════════════════════════════════════════════════════════

  cargarFijos(): void {
    this.fixedExpensesService.getAll().subscribe({
      next: (data) => {
        this.gastosFijos = data;
        this.totalFijosActivos = data
          .filter(f => f.isActive)
          .reduce((sum, f) => sum + f.amount, 0);
      }
    });
  }

  abrirModalFijo(fijo?: FixedExpense): void {
    if (fijo) {
      this.editandoFijo = true;
      this.formFijo = { ...fijo };
    } else {
      this.editandoFijo = false;
      this.formFijo = this.getEmptyFormFijo();
    }
    this.mostrarModalFijo = true;
  }

  cerrarModalFijo(): void { this.mostrarModalFijo = false; }

  guardarFijo(): void {
    if (this.editandoFijo && this.formFijo._id) {
      this.fixedExpensesService.update(this.formFijo._id, this.formFijo).subscribe({
        next: () => { this.alertService.toast('Gasto fijo actualizado'); this.cargarFijos(); this.cerrarModalFijo(); },
        error: () => this.alertService.error('Error al actualizar')
      });
    } else {
      this.fixedExpensesService.create(this.formFijo).subscribe({
        next: () => { this.alertService.success('Gasto fijo registrado'); this.cargarFijos(); this.cerrarModalFijo(); },
        error: () => this.alertService.error('Error al crear')
      });
    }
  }

  async eliminarFijo(fijo: FixedExpense): Promise<void> {
    const confirmar = await this.alertService.confirm(
      'Eliminar Gasto Fijo',
      `¿Eliminar "${fijo.name}" del catálogo? Dejará de incluirse en los reportes.`,
      'Sí, eliminar'
    );
    if (confirmar) {
      this.fixedExpensesService.delete(fijo._id).subscribe({
        next: () => { this.alertService.toast('Gasto fijo eliminado'); this.cargarFijos(); },
        error: () => this.alertService.error('No se pudo eliminar')
      });
    }
  }

  async toggleActivoFijo(fijo: FixedExpense): Promise<void> {
    this.fixedExpensesService.update(fijo._id, { isActive: !fijo.isActive }).subscribe({
      next: () => {
        this.alertService.toast(fijo.isActive ? 'Gasto fijo desactivado' : 'Gasto fijo activado');
        this.cargarFijos();
      },
      error: () => this.alertService.error('Error al actualizar')
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────

  getCategoryIcon(cat: string): string {
    const map: Record<string, string> = {
      'Alquiler': '🏠', 'Servicios': '💡', 'Gas': '🔥', 'Limpieza': '🧹',
      'Mantenimiento': '🔧', 'Marketing': '📣', 'Nómina': '💼',
      'Compras Insumos': '🛒', 'Transporte': '🚗', 'Otros': '📎'
    };
    return map[cat] || '📎';
  }

  getCategoryClass(cat: string): string {
    const map: Record<string, string> = {
      'Alquiler': 'cat-alquiler', 'Servicios': 'cat-servicios', 'Gas': 'cat-gas',
      'Limpieza': 'cat-limpieza', 'Mantenimiento': 'cat-mantenimiento',
      'Marketing': 'cat-marketing', 'Nómina': 'cat-nomina',
      'Compras Insumos': 'cat-compras', 'Transporte': 'cat-transporte', 'Otros': 'cat-otros'
    };
    return map[cat] || 'cat-otros';
  }

  getSummaryPct(catTotal: number): number {
    if (!this.summary || this.summary.totalGastos === 0) return 0;
    return Math.round((catTotal / this.summary.totalGastos) * 100);
  }

  private getEmptyFormVariable(): Partial<Expense> {
    const hoy = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Caracas',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
    return { description: '', amount: 0, category: 'Otros', date: hoy, notes: '' };
  }

  private getEmptyFormFijo(): Partial<FixedExpense> {
    return { name: '', amount: 0, category: 'Otros', isActive: true, notes: '' };
  }
}
