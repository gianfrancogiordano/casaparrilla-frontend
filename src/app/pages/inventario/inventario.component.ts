import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IngredientsService, Ingredient, UnitMeasure } from '../../services/ingredients.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DecimalPipe],
  templateUrl: './inventario.component.html',
  styleUrl: './inventario.component.scss'
})
export class InventarioComponent implements OnInit {
  ingredientes: Ingredient[] = [];
  ingredientesFiltrados: Ingredient[] = [];
  searchText: string = '';
  
  // Stats
  lowStockCount: number = 0;
  outOfStockCount: number = 0;

  // Modal / Form
  mostrarModal = false;
  editando = false;
  unidades: UnitMeasure[] = [];
  form: Partial<Ingredient> = this.getEmptyForm();

  constructor(
    private ingredientsService: IngredientsService,
    private alertService: AlertService
  ) {
    this.unidades = this.ingredientsService.getUnits();
  }

  ngOnInit(): void {
    this.cargarIngredientes();
  }

  cargarIngredientes(): void {
    this.ingredientsService.getAll().subscribe({
      next: (data) => {
        this.ingredientes = data;
        this.filtrarIngredientes();
        this.actualizarStats();
      }
    });
  }

  actualizarStats(): void {
    this.lowStockCount = this.ingredientes.filter(i => i.currentStock > 0 && i.currentStock < i.minStock).length;
    this.outOfStockCount = this.ingredientes.filter(i => i.currentStock === 0).length;
  }

  filtrarIngredientes(): void {
    if (!this.searchText) {
      this.ingredientesFiltrados = [...this.ingredientes];
    } else {
      const search = this.searchText.toLowerCase();
      this.ingredientesFiltrados = this.ingredientes.filter(i => 
        i.name.toLowerCase().includes(search)
      );
    }
  }

  ajusteRapido(item: Ingredient, delta: number): void {
    // Si delta es negativo y el stock es 0, no hacer nada
    if (delta < 0 && item.currentStock <= 0) return;

    this.ingredientsService.adjustStock(item._id, delta).subscribe({
      next: (res) => {
        item.currentStock = res.currentStock;
        this.actualizarStats();
        this.alertService.toast(`Stock de ${item.name} actualizado`);
      },
      error: () => this.alertService.error('Error al ajustar stock')
    });
  }

  abrirModal(item?: Ingredient): void {
    if (item) {
      this.editando = true;
      this.form = { ...item };
    } else {
      this.editando = false;
      this.form = this.getEmptyForm();
    }
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  guardar(): void {
    if (this.editando && this.form._id) {
      this.ingredientsService.update(this.form._id, this.form).subscribe({
        next: () => {
          this.alertService.toast('Ingrediente actualizado');
          this.cargarIngredientes();
          this.cerrarModal();
        },
        error: () => this.alertService.error('Error al actualizar el ingrediente')
      });
    } else {
      this.ingredientsService.create(this.form).subscribe({
        next: () => {
          this.alertService.success('Ingrediente creado con éxito');
          this.cargarIngredientes();
          this.cerrarModal();
        },
        error: () => this.alertService.error('Error al crear el ingrediente')
      });
    }
  }

  async eliminarIngrediente(item: Ingredient): Promise<void> {
    const confirmar = await this.alertService.confirm(
      'Eliminar Ingrediente',
      `¿Estás seguro de que deseas eliminar permanentemente "${item.name}"?`,
      'Sí, eliminar'
    );

    if (confirmar) {
      this.ingredientsService.delete(item._id).subscribe({
        next: () => {
          this.alertService.toast('Ingrediente eliminado');
          this.cargarIngredientes();
        },
        error: () => this.alertService.error('No se pudo eliminar el ingrediente')
      });
    }
  }

  // Helpers de UI
  getStockColor(item: Ingredient): string {
    if (item.currentStock === 0) return 'text-danger';
    if (item.currentStock < item.minStock) return 'text-warning';
    return 'text-success';
  }

  getStatusBadgeClass(item: Ingredient): string {
    if (item.currentStock === 0) return 'status-none';
    if (item.currentStock < item.minStock) return 'status-low';
    return 'status-ok';
  }

  getStatusText(item: Ingredient): string {
    if (item.currentStock === 0) return 'Agotado';
    if (item.currentStock < item.minStock) return 'Bajo Stock';
    return 'En Stock';
  }

  private getEmptyForm(): Partial<Ingredient> {
    return {
      name: '',
      unitMeasure: 'Kg',
      unitCost: 0,
      currentStock: 0,
      minStock: 0
    };
  }
}
