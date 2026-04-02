import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientsService, Client } from '../../services/clients.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss'
})
export class ClientesComponent implements OnInit {
  clientes: Client[] = [];
  clientesFiltrados: Client[] = [];
  searchText = '';
  
  // Stats
  totalPuntos = 0;
  topCliente: Client | null = null;
  
  // Modal state
  mostrarModal = false;
  editando = false;
  clienteSeleccionadoId: string | null = null;
  
  form = {
    name: '',
    phone: '',
    email: '',
    loyaltyPoints: 0
  };

  constructor(
    private clientsService: ClientsService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.cargarClientes();
  }

  cargarClientes(): void {
    this.clientsService.getAll().subscribe({
      next: (data) => {
        this.clientes = data;
        this.clientesFiltrados = data;
        this.calcularStats();
      },
      error: (err) => console.error('Error al cargar clientes:', err)
    });
  }

  filtrarClientes(): void {
    const text = this.searchText.toLowerCase().trim();
    if (!text) {
      this.clientesFiltrados = this.clientes;
      return;
    }
    this.clientesFiltrados = this.clientes.filter(c => 
      c.name.toLowerCase().includes(text) || 
      (c.phone && c.phone.includes(text)) ||
      (c.email && c.email.toLowerCase().includes(text))
    );
  }

  calcularStats(): void {
    this.totalPuntos = this.clientes.reduce((acc, c) => acc + (c.loyaltyPoints || 0), 0);
    if (this.clientes.length > 0) {
      this.topCliente = [...this.clientes].sort((a, b) => (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0))[0];
    }
  }

  abrirModal(cliente?: Client): void {
    if (cliente) {
      this.editando = true;
      this.clienteSeleccionadoId = cliente._id;
      this.form = {
        name: cliente.name,
        phone: cliente.phone || '',
        email: cliente.email || '',
        loyaltyPoints: cliente.loyaltyPoints || 0
      };
    } else {
      this.editando = false;
      this.clienteSeleccionadoId = null;
      this.form = { name: '', phone: '', email: '', loyaltyPoints: 0 };
    }
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  guardar(): void {
    if (this.editando && this.clienteSeleccionadoId) {
      this.clientsService.update(this.clienteSeleccionadoId, this.form).subscribe({
        next: () => {
          this.alertService.toast('Cliente actualizado');
          this.cargarClientes();
          this.cerrarModal();
        },
        error: () => this.alertService.error('Error al actualizar el cliente')
      });
    } else {
      this.clientsService.create(this.form).subscribe({
        next: () => {
          this.alertService.success('Cliente registrado con éxito');
          this.cargarClientes();
          this.cerrarModal();
        },
        error: () => this.alertService.error('Error al registrar el cliente')
      });
    }
  }

  async eliminarCliente(cliente: Client): Promise<void> {
    const confirmar = await this.alertService.confirm(
      'Eliminar Cliente',
      `¿Estás seguro de que deseas eliminar a "${cliente.name}"?`,
      'Sí, eliminar'
    );

    if (confirmar) {
      this.clientsService.delete(cliente._id).subscribe({
        next: () => {
          this.alertService.toast('Cliente eliminado');
          this.cargarClientes();
        },
        error: () => this.alertService.error('No se pudo eliminar el cliente')
      });
    }
  }
}
