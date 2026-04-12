import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfiguracionService, Configuracion } from '../../services/configuracion.service';
import { AuthService } from '../../services/auth.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.scss',
})
export class ConfiguracionComponent implements OnInit {
  cargando = true;
  guardando = false;
  seccionActiva = 'general';

  readonly nombresDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  readonly horarioDefault = () => [
    { activo: true,  apertura: '12:00', cierre: '22:00' }, // 0 Domingo
    { activo: false, apertura: '12:00', cierre: '22:00' }, // 1 Lunes
    { activo: false, apertura: '12:00', cierre: '22:00' }, // 2 Martes
    { activo: false, apertura: '12:00', cierre: '22:00' }, // 3 Miércoles
    { activo: true,  apertura: '12:00', cierre: '22:00' }, // 4 Jueves
    { activo: true,  apertura: '12:00', cierre: '22:00' }, // 5 Viernes
    { activo: true,  apertura: '12:00', cierre: '22:00' }, // 6 Sábado
  ];

  form: any = {
    nombreRestaurante: '',
    monedaPrincipal: 'USD',
    tasaCambioUsdBs: 0,
    tasaCambioUsdCop: 0,
    cantidadMesas: 0,
    direccion: '',
    telefono: '',
    activo: true,
    monedaDefaultTienda: 'COP',
    pagoBancolombia: '',
    pagoBinance: '',
    pagoEfectivo: '',
    pagoPagoMovil: '',
    pagoZelle: '',
    horario: this.horarioDefault(),
  };

  constructor(
    private configService: ConfiguracionService,
    private authService: AuthService,
    private alertService: AlertService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.configService.get().subscribe({
      next: (config: any) => {
        this.form = {
          nombreRestaurante: config.nombreRestaurante || '',
          monedaPrincipal: config.monedaPrincipal || 'USD',
          tasaCambioUsdBs: config.tasaCambioUsdBs || 0,
          tasaCambioUsdCop: config.tasaCambioUsdCop || 0,
          cantidadMesas: config.cantidadMesas || 0,
          direccion: config.direccion || '',
          telefono: config.telefono || '',
          activo: config.activo ?? true,
          monedaDefaultTienda: config.monedaDefaultTienda || 'COP',
          pagoBancolombia: config.pagoBancolombia || '',
          pagoBinance: config.pagoBinance || '',
          pagoEfectivo: config.pagoEfectivo || '',
          pagoPagoMovil: config.pagoPagoMovil || '',
          pagoZelle: config.pagoZelle || '',
          horario: config.horario?.length === 7
            ? config.horario.map((d: any) => ({ activo: d.activo, apertura: d.apertura, cierre: d.cierre }))
            : this.horarioDefault(),
        };
        this.cargando = false;
      },
      error: () => {
        this.alertService.error('Error al cargar la configuración.');
        this.cargando = false;
      },
    });
  }

  guardar(): void {
    this.guardando = true;
    this.configService.update(this.form).subscribe({
      next: () => {
        this.guardando = false;
        this.alertService.success('✅ Configuración guardada correctamente.');
      },
      error: () => {
        this.guardando = false;
        this.alertService.error('Error al guardar la configuración.');
      },
    });
  }

  setSeccion(s: string): void {
    this.seccionActiva = s;
  }
}
