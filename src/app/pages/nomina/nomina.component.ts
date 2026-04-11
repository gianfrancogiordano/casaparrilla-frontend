import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayrollService, Employee, PayrollRecord, PayrollSummary } from '../../services/payroll.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-nomina',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './nomina.component.html',
  styleUrl: './nomina.component.scss'
})
export class NominaComponent implements OnInit {
  employees: Employee[] = [];
  payrolls: PayrollRecord[] = [];
  payrollsFiltradas: PayrollRecord[] = [];
  summary: PayrollSummary | null = null;

  vistaActiva: 'nomina' | 'empleados' = 'nomina';
  filtroStatus = '';
  filtroDesde = '';
  filtroHasta = '';

  // Modal Empleado
  mostrarModalEmpleado = false;
  editandoEmpleado = false;
  formEmpleado: Partial<Employee> = this.getEmptyEmployee();

  // Modal Nómina Individual
  mostrarModalNomina = false;
  formNomina: any = this.getEmptyPayroll();

  // Modal Generación Masiva
  mostrarModalGenerar = false;
  generarDesde = '';
  generarHasta = '';

  // Modal Pagar
  mostrarModalPagar = false;
  nominaPagar: PayrollRecord | null = null;
  metodoPago = 'Efectivo';

  // Modal Detalle
  mostrarDetalle = false;
  nominaDetalle: PayrollRecord | null = null;

  constructor(
    private payrollService: PayrollService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.setMesActual();
    this.cargarEmpleados();
  }

  // ── Carga ───────────────────────────────────────────────────────────

  cargarEmpleados(): void {
    this.payrollService.getEmployees().subscribe({
      next: (data) => this.employees = data
    });
  }

  cargarNominas(): void {
    this.payrollService.getPayrolls().subscribe({
      next: (data) => {
        this.payrolls = data;
        this.aplicarFiltros();
      }
    });
    this.cargarSummary();
  }

  cargarSummary(): void {
    this.payrollService.getSummary(this.filtroDesde, this.filtroHasta).subscribe({
      next: (data) => this.summary = data
    });
  }

  setMesActual(): void {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    this.filtroDesde = `${year}-${month}-01`;
    this.filtroHasta = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(hoy);
    this.cargarNominas();
  }

  aplicarFiltros(): void {
    let resultado = [...this.payrolls];
    if (this.filtroStatus) resultado = resultado.filter(p => p.status === this.filtroStatus);
    if (this.filtroDesde) {
      const t = new Date(`${this.filtroDesde}T00:00:00-04:00`).getTime();
      resultado = resultado.filter(p => new Date(p.periodEnd).getTime() >= t);
    }
    if (this.filtroHasta) {
      const t = new Date(`${this.filtroHasta}T23:59:59-04:00`).getTime();
      resultado = resultado.filter(p => new Date(p.periodStart).getTime() <= t);
    }
    this.payrollsFiltradas = resultado;
  }

  // ── Empleados CRUD ──────────────────────────────────────────────────

  abrirModalEmpleado(emp?: Employee): void {
    if (emp) {
      this.editandoEmpleado = true;
      this.formEmpleado = { ...emp, startDate: emp.startDate?.substring(0, 10) };
    } else {
      this.editandoEmpleado = false;
      this.formEmpleado = this.getEmptyEmployee();
    }
    this.mostrarModalEmpleado = true;
  }

  cerrarModalEmpleado(): void { this.mostrarModalEmpleado = false; }

  guardarEmpleado(): void {
    if (this.editandoEmpleado && this.formEmpleado._id) {
      this.payrollService.updateEmployee(this.formEmpleado._id, this.formEmpleado).subscribe({
        next: () => { this.alertService.toast('Empleado actualizado'); this.cargarEmpleados(); this.cerrarModalEmpleado(); },
        error: () => this.alertService.error('Error al actualizar')
      });
    } else {
      this.payrollService.createEmployee(this.formEmpleado).subscribe({
        next: () => { this.alertService.success('Empleado registrado'); this.cargarEmpleados(); this.cerrarModalEmpleado(); },
        error: () => this.alertService.error('Error al crear empleado')
      });
    }
  }

  async eliminarEmpleado(emp: Employee): Promise<void> {
    const ok = await this.alertService.confirm('Eliminar Empleado', `¿Eliminar a "${emp.name}"?`, 'Sí, eliminar');
    if (ok) {
      this.payrollService.deleteEmployee(emp._id).subscribe({
        next: () => { this.alertService.toast('Empleado eliminado'); this.cargarEmpleados(); }
      });
    }
  }

  // ── Nómina Individual ───────────────────────────────────────────────

  abrirModalNomina(): void {
    this.formNomina = this.getEmptyPayroll();
    this.mostrarModalNomina = true;
  }

  cerrarModalNomina(): void { this.mostrarModalNomina = false; }

  onEmpleadoSelected(): void {
    const emp = this.employees.find(e => e._id === this.formNomina.employeeId);
    if (emp) this.formNomina.baseSalary = emp.baseSalary;
    this.calcularNetPay();
  }

  agregarBono(): void {
    this.formNomina.bonuses.push({ description: '', amount: 0 });
  }

  quitarBono(i: number): void {
    this.formNomina.bonuses.splice(i, 1);
    this.calcularNetPay();
  }

  agregarDeduccion(): void {
    this.formNomina.deductions.push({ description: '', amount: 0 });
  }

  quitarDeduccion(i: number): void {
    this.formNomina.deductions.splice(i, 1);
    this.calcularNetPay();
  }

  calcularNetPay(): void {
    const bonuses = this.formNomina.bonuses.reduce((s: number, b: any) => s + (b.amount || 0), 0);
    const deductions = this.formNomina.deductions.reduce((s: number, d: any) => s + (d.amount || 0), 0);
    this.formNomina.totalBonuses = bonuses;
    this.formNomina.totalDeductions = deductions;
    this.formNomina.netPay = (this.formNomina.baseSalary || 0) + bonuses - deductions;
  }

  guardarNomina(): void {
    this.payrollService.createPayroll(this.formNomina).subscribe({
      next: () => { this.alertService.success('Nómina creada'); this.cargarNominas(); this.cerrarModalNomina(); },
      error: () => this.alertService.error('Error al crear nómina')
    });
  }

  // ── Generar Masiva ──────────────────────────────────────────────────

  abrirModalGenerar(): void {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    this.generarDesde = `${year}-${month}-01`;
    this.generarHasta = `${year}-${month}-15`;
    this.mostrarModalGenerar = true;
  }

  cerrarModalGenerar(): void { this.mostrarModalGenerar = false; }

  async generarNominas(): Promise<void> {
    const ok = await this.alertService.confirm(
      'Generar Nómina Masiva',
      `¿Generar nómina para todos los empleados activos (${this.employees.filter(e => e.active).length}) del período ${this.generarDesde} al ${this.generarHasta}?`,
      'Sí, generar'
    );
    if (ok) {
      this.payrollService.generateBulk(this.generarDesde, this.generarHasta).subscribe({
        next: (data) => {
          this.alertService.success(`✅ ${data.length} nóminas generadas`);
          this.cargarNominas();
          this.cerrarModalGenerar();
        },
        error: (err) => this.alertService.error(err?.error?.message || 'Error al generar')
      });
    }
  }

  // ── Pagar ───────────────────────────────────────────────────────────

  abrirModalPagar(nomina: PayrollRecord): void {
    this.nominaPagar = nomina;
    this.metodoPago = 'Efectivo';
    this.mostrarModalPagar = true;
  }

  cerrarModalPagar(): void { this.mostrarModalPagar = false; this.nominaPagar = null; }

  confirmarPago(): void {
    if (!this.nominaPagar) return;
    this.payrollService.markAsPaid(this.nominaPagar._id, this.metodoPago).subscribe({
      next: () => {
        this.alertService.success('💵 Nómina marcada como pagada');
        this.cargarNominas();
        this.cerrarModalPagar();
      },
      error: (err) => this.alertService.error(err?.error?.message || 'Error')
    });
  }

  // ── Detalle ─────────────────────────────────────────────────────────

  verDetalle(nomina: PayrollRecord): void {
    this.nominaDetalle = nomina;
    this.mostrarDetalle = true;
  }

  cerrarDetalle(): void { this.mostrarDetalle = false; this.nominaDetalle = null; }

  async eliminarNomina(nomina: PayrollRecord): Promise<void> {
    const ok = await this.alertService.confirm('Eliminar Registro', '¿Eliminar este registro de nómina?', 'Sí, eliminar');
    if (ok) {
      this.payrollService.deletePayroll(nomina._id).subscribe({
        next: () => { this.alertService.toast('Registro eliminado'); this.cargarNominas(); }
      });
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────

  getEmployeeName(emp: any): string { return emp?.name || 'N/A'; }
  getEmployeePosition(emp: any): string { return emp?.position || ''; }

  getStatusClass(s: string): string {
    return s === 'Pagado' ? 'status-pagado' : 'status-pendiente';
  }

  getTypeClass(t: string): string {
    const m: Record<string, string> = { 'Tiempo Completo': 'type-full', 'Medio Tiempo': 'type-half', 'Por Turno': 'type-shift' };
    return m[t] || '';
  }

  getMonthlySalary(emp: Employee): number {
    if (emp.payFrequency === 'Semanal') return emp.baseSalary * 4;
    if (emp.payFrequency === 'Quincenal') return emp.baseSalary * 2;
    return emp.baseSalary;
  }

  private getEmptyEmployee(): Partial<Employee> {
    return {
      name: '', cedula: '', phone: '', position: '', type: 'Tiempo Completo',
      baseSalary: 0, payFrequency: 'Quincenal', active: true, bankName: '', bankAccount: '', notes: ''
    };
  }

  private getEmptyPayroll(): any {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    return {
      employeeId: '', periodStart: `${year}-${month}-01`, periodEnd: `${year}-${month}-15`,
      baseSalary: 0, bonuses: [], deductions: [], totalBonuses: 0, totalDeductions: 0, netPay: 0, notes: ''
    };
  }
}
