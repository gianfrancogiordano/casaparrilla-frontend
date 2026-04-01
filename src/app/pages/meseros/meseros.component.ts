import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ConfiguracionService, Configuracion } from '../../services/configuracion.service';
import { OrdersService, Order } from '../../services/orders.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin, map, of, catchError } from 'rxjs';

export interface MesaState {
  numero: number;
  label: string;
  orden: Order | null;
  cargando: boolean;
}

@Component({
  selector: 'app-meseros',
  imports: [CommonModule],
  templateUrl: './meseros.component.html',
  styleUrl: './meseros.component.scss',
})
export class MeserosComponent implements OnInit {
  config: Configuracion | null = null;
  mesas: MesaState[] = [];
  cargando = true;
  error = '';

  constructor(
    private configuracionService: ConfiguracionService,
    private ordersService: OrdersService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.cargarMesas();
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
    this.router.navigate(['/meseros', mesa.numero]);
  }

  getMesaStatus(mesa: MesaState): 'libre' | 'ocupada' {
    return mesa.orden ? 'ocupada' : 'libre';
  }
}
