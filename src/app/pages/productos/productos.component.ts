import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductsService, Product, RecipeItem } from '../../services/products.service';
import { IngredientsService, Ingredient } from '../../services/ingredients.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.scss'
})
export class ProductosComponent implements OnInit {
  productos: Product[] = [];
  productosFiltrados: Product[] = [];
  ingredientesDisponibles: Ingredient[] = [];
  categorias: string[] = [];
  searchText: string = '';

  // Modal / Form
  mostrarModal = false;
  editando = false;
  form: Partial<Product> = this.getEmptyForm();

  constructor(
    private productsService: ProductsService,
    private ingredientsService: IngredientsService,
    private alertService: AlertService
  ) {
    this.categorias = this.productsService.getCategories();
  }

  ngOnInit(): void {
    this.cargarProductos();
    this.cargarIngredientes();
  }

  cargarProductos(): void {
    this.productsService.getAll().subscribe({
      next: (data) => {
        this.productos = data;
        this.filtrarProductos();
      }
    });
  }

  cargarIngredientes(): void {
    this.ingredientsService.getAll().subscribe({
      next: (data) => this.ingredientesDisponibles = data
    });
  }

  filtrarProductos(): void {
    if (!this.searchText) {
      this.productosFiltrados = [...this.productos];
    } else {
      const search = this.searchText.toLowerCase();
      this.productosFiltrados = this.productos.filter(p => 
        p.name.toLowerCase().includes(search) || 
        p.category?.toLowerCase().includes(search)
      );
    }
  }

  toggleAvailability(product: Product): void {
    const newVal = !product.available;
    this.productsService.update(product._id, { available: newVal }).subscribe({
      next: () => {
        product.available = newVal;
        this.alertService.toast(`Producto ${newVal ? 'disponible' : 'no disponible'}`);
      },
      error: () => this.alertService.error('Error al cambiar disponibilidad')
    });
  }

  abrirModal(product?: Product): void {
    if (product) {
      this.editando = true;
      // Clonar para no modificar la tabla directamente
      this.form = JSON.parse(JSON.stringify(product));
      if (!this.form.recipe) this.form.recipe = [];
    } else {
      this.editando = false;
      this.form = this.getEmptyForm();
    }
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  // --- Lógica de Receta ---
  agregarIngredienteReceta(): void {
    if (!this.form.recipe) this.form.recipe = [];
    this.form.recipe.push({
      ingredientId: '',
      ingredientName: '',
      quantityRequired: 0,
      unitMeasure: ''
    });
  }

  quitarIngredienteReceta(index: number): void {
    this.form.recipe?.splice(index, 1);
  }

  onIngredientSelect(item: RecipeItem): void {
    const ing = this.ingredientesDisponibles.find(i => i._id === item.ingredientId);
    if (ing) {
      item.ingredientName = ing.name;
      item.unitMeasure = ing.unitMeasure;
    }
  }

  // --- CRUD ---
  guardar(): void {
    if (this.editando && this.form._id) {
      this.productsService.update(this.form._id, this.form).subscribe({
        next: () => {
          this.alertService.toast('Producto actualizado');
          this.cargarProductos();
          this.cerrarModal();
        },
        error: () => this.alertService.error('Error al actualizar el producto')
      });
    } else {
      this.productsService.create(this.form).subscribe({
        next: () => {
          this.alertService.success('Producto creado con éxito');
          this.cargarProductos();
          this.cerrarModal();
        },
        error: () => this.alertService.error('Error al crear el producto')
      });
    }
  }

  async eliminarProducto(product: Product): Promise<void> {
    const confirmar = await this.alertService.confirm(
      'Eliminar Producto',
      `¿Estás seguro de que deseas eliminar permanentemente "${product.name}"?`,
      'Sí, eliminar'
    );

    if (confirmar) {
      this.productsService.delete(product._id).subscribe({
        next: () => {
          this.alertService.toast('Producto eliminado');
          this.cargarProductos();
        },
        error: () => this.alertService.error('No se pudo eliminar el producto')
      });
    }
  }

  private getEmptyForm(): Partial<Product> {
    return {
      name: '',
      description: '',
      sellPrice: 0,
      category: '',
      imageUrl: '',
      available: true,
      requiresKitchen: true,
      recipe: []
    };
  }
}
