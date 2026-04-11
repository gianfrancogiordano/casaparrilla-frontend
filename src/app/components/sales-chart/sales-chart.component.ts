import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { TrendPoint } from '../../services/reports.service';

Chart.register(...registerables);

@Component({
  selector: 'app-sales-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-wrapper position-relative" style="height: 320px;">
      <canvas #chartCanvas></canvas>
      <div *ngIf="!data || data.length === 0"
           class="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center text-muted">
        <p class="fs-3 mb-1">📊</p>
        <p class="small">No hay datos de ventas en este período.</p>
      </div>
    </div>
  `,
})
export class SalesChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() data: TrendPoint[] = [];

  private chart: Chart | null = null;

  ngAfterViewInit(): void {
    if (this.data?.length > 0) {
      this.buildChart();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.canvasRef) {
      this.buildChart();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private buildChart(): void {
    if (!this.canvasRef || !this.data?.length) return;

    // Destruir chart previo si existe
    this.chart?.destroy();

    const labels = this.data.map(p => this.formatLabel(p.fecha));
    const ventas  = this.data.map(p => p.ventas);
    const ordenes = this.data.map(p => p.ordenes);

    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 320);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.00)');

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Ventas (USD)',
            data: ventas,
            backgroundColor: 'rgba(99, 102, 241, 0.75)',
            borderColor:     'rgba(99, 102, 241, 1)',
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
            yAxisID: 'y',
          },
          {
            type: 'line',
            label: 'Órdenes',
            data: ordenes,
            borderColor:      'rgba(251, 146, 60, 1)',
            backgroundColor:  'rgba(251, 146, 60, 0.1)',
            borderWidth: 2.5,
            pointBackgroundColor: 'rgba(251, 146, 60, 1)',
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.35,
            yAxisID: 'y2',
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              font: { size: 12, family: "'Inter', 'Segoe UI', sans-serif" },
              color: '#6b7280',
              padding: 20,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.9)',
            titleColor: '#f9fafb',
            bodyColor:  '#d1d5db',
            borderColor: 'rgba(99, 102, 241, 0.5)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: (ctx) => {
                if (ctx.datasetIndex === 0) {
                  return `  💰 Ventas: $${(ctx.parsed.y as number).toFixed(2)}`;
                }
                return `  📦 Órdenes: ${ctx.parsed.y}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid:  { display: false },
            border: { display: false },
            ticks: {
              color: '#9ca3af',
              font:  { size: 11, family: "'Inter', 'Segoe UI', sans-serif" },
              maxRotation: 45,
            },
          },
          y: {
            position: 'left',
            grid:  { color: 'rgba(0,0,0,0.05)' },
            border: { display: false },
            ticks: {
              color:  '#9ca3af',
              font:   { size: 11 },
              callback: (v) => `$${v}`,
            },
          },
          y2: {
            position: 'right',
            grid:  { display: false },
            border: { display: false },
            ticks: {
              color: 'rgba(251, 146, 60, 0.8)',
              font:  { size: 11 },
              stepSize: 1,
            },
          },
        },
      },
    };

    this.chart = new Chart(ctx, config);
  }

  private formatLabel(fecha: string): string {
    const d = new Date(fecha + 'T12:00:00');
    return d.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' });
  }
}
