import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BanksService, BankAccount, BankMovement, BankSummary } from '../../services/banks.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-bancos',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './bancos.component.html',
  styleUrl: './bancos.component.scss',
})
export class BancosComponent implements OnInit {

  // ── Vista ─────────────────────────────────────────────────────────
  vista: 'cuentas' | 'movimientos' = 'cuentas';

  // ── Datos ─────────────────────────────────────────────────────────
  cuentas: BankAccount[] = [];
  summary: BankSummary | null = null;
  movimientos: BankMovement[] = [];
  cuentaSeleccionada: BankAccount | null = null;

  // ── Filtros Movimientos ───────────────────────────────────────────
  filtroDesde = '';
  filtroHasta = '';
  filtroTipo  = '';

  // ── Modal Cuenta ──────────────────────────────────────────────────
  mostrarModalCuenta = false;
  editandoCuenta = false;
  formCuenta: Partial<BankAccount> = this.getEmptyCuenta();

  // ── Modal Movimiento ──────────────────────────────────────────────
  mostrarModalMov = false;
  formMov: Partial<BankMovement> = this.getEmptyMov();

  constructor(
    public banksService: BanksService,
    private alertService: AlertService,
  ) {}

  ngOnInit(): void {
    this.cargarCuentas();
  }

  // ══════════════════════════════════════════════════════════════════
  // CUENTAS
  // ══════════════════════════════════════════════════════════════════

  cargarCuentas(): void {
    this.banksService.getAccounts().subscribe({
      next: (data) => this.cuentas = data,
    });
    this.cargarSummary();
  }

  cargarSummary(): void {
    this.banksService.getSummary(this.filtroDesde, this.filtroHasta).subscribe({
      next: (data) => this.summary = data,
    });
  }

  abrirModalCuenta(cuenta?: BankAccount): void {
    if (cuenta) {
      this.editandoCuenta = true;
      this.formCuenta = { ...cuenta };
    } else {
      this.editandoCuenta = false;
      this.formCuenta = this.getEmptyCuenta();
    }
    this.mostrarModalCuenta = true;
  }

  cerrarModalCuenta(): void {
    this.mostrarModalCuenta = false;
  }

  guardarCuenta(): void {
    if (this.editandoCuenta && this.formCuenta._id) {
      this.banksService.updateAccount(this.formCuenta._id, this.formCuenta).subscribe({
        next: () => {
          this.alertService.toast('Cuenta actualizada');
          this.cargarCuentas();
          this.cerrarModalCuenta();
          // Si estamos viendo los movimientos de esta cuenta, actualizar la referencia
          if (this.cuentaSeleccionada && this.cuentaSeleccionada._id === this.formCuenta._id) {
            this.banksService.getAccounts().subscribe({
              next: (cuentas) => {
                this.cuentaSeleccionada = cuentas.find(c => c._id === this.formCuenta._id) || this.cuentaSeleccionada;
              }
            });
          }
        },
        error: () => this.alertService.error('Error al actualizar cuenta'),
      });
    } else {
      this.banksService.createAccount(this.formCuenta).subscribe({
        next: () => {
          this.alertService.success('Cuenta creada');
          this.cargarCuentas();
          this.cerrarModalCuenta();
        },
        error: () => this.alertService.error('Error al crear cuenta'),
      });
    }
  }

  async eliminarCuenta(cuenta: BankAccount): Promise<void> {
    const confirmar = await this.alertService.confirm(
      'Eliminar Cuenta',
      `¿Eliminar "${cuenta.name}"? Solo se puede si no tiene movimientos.`,
      'Sí, eliminar'
    );
    if (confirmar) {
      this.banksService.deleteAccount(cuenta._id).subscribe({
        next: () => {
          this.alertService.toast('Cuenta eliminada');
          this.cargarCuentas();
        },
        error: (err) => this.alertService.error(err?.error?.message || 'No se pudo eliminar'),
      });
    }
  }

  async toggleActivoCuenta(cuenta: BankAccount): Promise<void> {
    this.banksService.updateAccount(cuenta._id, { isActive: !cuenta.isActive }).subscribe({
      next: () => {
        this.alertService.toast(cuenta.isActive ? 'Cuenta desactivada' : 'Cuenta activada');
        this.cargarCuentas();
      },
      error: () => this.alertService.error('Error al actualizar'),
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // MOVIMIENTOS (vista detail)
  // ══════════════════════════════════════════════════════════════════

  verMovimientos(cuenta: BankAccount): void {
    this.cuentaSeleccionada = cuenta;
    this.vista = 'movimientos';
    this.setMesActual();
  }

  volverACuentas(): void {
    this.vista = 'cuentas';
    this.cuentaSeleccionada = null;
    this.movimientos = [];
    this.cargarCuentas();
  }

  cargarMovimientos(): void {
    if (!this.cuentaSeleccionada) return;
    this.banksService.getMovements(
      this.cuentaSeleccionada._id,
      this.filtroDesde,
      this.filtroHasta,
      this.filtroTipo,
    ).subscribe({
      next: (data) => this.movimientos = data,
    });
    // Refrescar saldo de la cuenta
    this.banksService.getAccounts().subscribe({
      next: (cuentas) => {
        const fresh = cuentas.find(c => c._id === this.cuentaSeleccionada?._id);
        if (fresh) this.cuentaSeleccionada = fresh;
      }
    });
  }

  setMesActual(): void {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    this.filtroDesde = `${year}-${month}-01`;
    this.filtroHasta = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Caracas',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(hoy);
    this.cargarMovimientos();
  }

  // ── Modal Movimiento ──────────────────────────────────────────────

  abrirModalMov(): void {
    this.formMov = this.getEmptyMov();
    this.mostrarModalMov = true;
  }

  cerrarModalMov(): void {
    this.mostrarModalMov = false;
  }

  guardarMovimiento(): void {
    if (!this.cuentaSeleccionada) return;
    const dto = {
      ...this.formMov,
      accountId: this.cuentaSeleccionada._id,
    };
    this.banksService.createMovement(dto).subscribe({
      next: () => {
        this.alertService.success('Movimiento registrado');
        this.cargarMovimientos();
        this.cerrarModalMov();
      },
      error: () => this.alertService.error('Error al registrar movimiento'),
    });
  }

  async eliminarMovimiento(mov: BankMovement): Promise<void> {
    const tipoLabel = mov.type === 'Ingreso' ? '+' : '-';
    const confirmar = await this.alertService.confirm(
      'Eliminar Movimiento',
      `¿Eliminar "${mov.description}" (${tipoLabel}${mov.amount.toFixed(2)})? El saldo se recalculará.`,
      'Sí, eliminar'
    );
    if (confirmar) {
      this.banksService.deleteMovement(mov._id).subscribe({
        next: () => {
          this.alertService.toast('Movimiento eliminado');
          this.cargarMovimientos();
        },
        error: () => this.alertService.error('No se pudo eliminar'),
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════

  getCurrencyBorderClass(currency: string): string {
    const map: Record<string, string> = {
      USD: 'border-usd', BS: 'border-bs', COP: 'border-cop', USDT: 'border-usdt',
    };
    return map[currency] || 'border-usd';
  }

  getBalanceClass(balance: number): string {
    if (balance > 0) return 'text-success';
    if (balance < 0) return 'text-danger';
    return 'text-muted';
  }

  getMovTypeClass(type: string): string {
    return type === 'Ingreso' ? 'mov-ingreso' : 'mov-egreso';
  }

  getMovAmountPrefix(type: string): string {
    return type === 'Ingreso' ? '+' : '-';
  }

  getTotalIngresos(): number {
    return this.movimientos
      .filter(m => m.type === 'Ingreso')
      .reduce((sum, m) => sum + m.amount, 0);
  }

  getTotalEgresos(): number {
    return this.movimientos
      .filter(m => m.type === 'Egreso')
      .reduce((sum, m) => sum + m.amount, 0);
  }

  private getEmptyCuenta(): Partial<BankAccount> {
    return {
      name: '',
      accountType: 'Corriente',
      accountNumber: '',
      currency: 'USD',
      isActive: true,
      linkedPaymentMethod: '',
      notes: '',
      icon: '🏦',
    };
  }

  private getEmptyMov(): Partial<BankMovement> {
    const hoy = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Caracas',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
    return {
      type: 'Ingreso',
      amount: 0,
      description: '',
      category: 'Otro',
      reference: '',
      date: hoy,
      notes: '',
    };
  }
}
