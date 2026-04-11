import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CashRegisterService, CashRegister } from '../../services/cash-register.service';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './caja.component.html',
  styleUrl: './caja.component.scss'
})
export class CajaComponent implements OnInit {
  cajaActual: CashRegister | null = null;
  historial: CashRegister[] = [];
  cargando = true;

  // Apertura
  montoInicial = 0;

  // Cierre
  mostrarModalCierre = false;
  montoReal = 0;
  notasCierre = '';

  // Retiro
  mostrarModalRetiro = false;
  montoRetiro = 0;
  razonRetiro = '';

  // Detalle historial
  mostrarDetalle = false;
  cajaDetalle: CashRegister | null = null;

  constructor(
    private cashService: CashRegisterService,
    private alertService: AlertService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarEstado();
  }

  cargarEstado(): void {
    this.cargando = true;
    this.cashService.getCurrent().subscribe({
      next: (data) => {
        this.cajaActual = data;
        this.cargando = false;
      },
      error: () => {
        this.cajaActual = null;
        this.cargando = false;
      }
    });
    this.cashService.getHistory().subscribe({
      next: (data) => this.historial = data
    });
  }

  // ── Apertura ───────────────────────────────────────────────────────

  abrirCaja(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.cashService.open(user.id, this.montoInicial).subscribe({
      next: (data) => {
        this.cajaActual = data;
        this.montoInicial = 0;
        this.alertService.success('💰 Caja abierta con éxito');
      },
      error: (err) => this.alertService.error(err?.error?.message || 'Error al abrir caja')
    });
  }

  // ── Cierre ─────────────────────────────────────────────────────────

  abrirModalCierre(): void {
    this.montoReal = 0;
    this.notasCierre = '';
    this.mostrarModalCierre = true;
  }

  cerrarModalCierre(): void {
    this.mostrarModalCierre = false;
  }

  async confirmarCierre(): Promise<void> {
    if (!this.cajaActual) return;
    const user = this.authService.getCurrentUser();
    if (!user) return;

    const confirmar = await this.alertService.confirm(
      'Cerrar Caja',
      `¿Confirmas que el monto real en caja es $${this.montoReal.toFixed(2)}?`,
      'Sí, cerrar caja'
    );
    if (!confirmar) return;

    this.cashService.close(this.cajaActual._id, user.id, this.montoReal, this.notasCierre).subscribe({
      next: () => {
        this.alertService.success('✅ Caja cerrada correctamente');
        this.mostrarModalCierre = false;
        this.cargarEstado();
      },
      error: (err) => this.alertService.error(err?.error?.message || 'Error al cerrar caja')
    });
  }

  // ── Retiro ─────────────────────────────────────────────────────────

  abrirModalRetiro(): void {
    this.montoRetiro = 0;
    this.razonRetiro = '';
    this.mostrarModalRetiro = true;
  }

  cerrarModalRetiro(): void {
    this.mostrarModalRetiro = false;
  }

  confirmarRetiro(): void {
    if (!this.cajaActual) return;

    this.cashService.withdraw(this.cajaActual._id, this.montoRetiro, this.razonRetiro).subscribe({
      next: (data) => {
        this.cajaActual = data;
        this.mostrarModalRetiro = false;
        this.alertService.toast('Retiro registrado');
      },
      error: () => this.alertService.error('Error al registrar retiro')
    });
  }

  // ── Detalle ────────────────────────────────────────────────────────

  verDetalle(caja: CashRegister): void {
    this.cajaDetalle = caja;
    this.mostrarDetalle = true;
  }

  cerrarDetalle(): void {
    this.mostrarDetalle = false;
    this.cajaDetalle = null;
  }

  // ── Helpers ────────────────────────────────────────────────────────

  getTotalRetiros(): number {
    if (!this.cajaActual) return 0;
    return this.cajaActual.withdrawals.reduce((sum, w) => sum + w.amount, 0);
  }

  getDifferenceClass(diff: number): string {
    if (diff === 0) return 'text-success';
    if (diff > 0) return 'text-primary';
    return 'text-danger';
  }

  getDifferenceLabel(diff: number): string {
    if (diff === 0) return '✅ Cuadra perfecto';
    if (diff > 0) return '📈 Sobrante';
    return '📉 Faltante';
  }
}
