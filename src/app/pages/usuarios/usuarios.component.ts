import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService, Usuario, Role } from '../../services/usuarios.service';
import { AlertService } from '../../services/alert.service';

interface Stats {
  total: number;
  activos: number;
  admins: number;
  meseros: number;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  role: string | undefined;
  active: boolean;
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.scss'
})
export class UsuariosComponent implements OnInit {
  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  roles: Role[] = [];

  stats: Stats = { total: 0, activos: 0, admins: 0, meseros: 0 };

  busqueda = '';
  filtroRol = '';
  filtroEstado = '';

  // Modal
  mostrarModal = false;
  editando = false;
  usuarioEditandoId: string | null = null;
  form: FormData = this.emptyForm();

  constructor(
    private usuariosService: UsuariosService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.cargarRoles();
    this.cargarUsuarios();
  }

  cargarRoles(): void {
    this.usuariosService.getRoles().subscribe({
      next: (data) => this.roles = data
    });
  }

  cargarUsuarios(): void {
    this.usuariosService.getAll().subscribe({
      next: (data) => {
        this.usuarios = data;
        this.filtrar();
        this.calcularStats();
      }
    });
  }

  // ── Filtros ──────────────────────────────────────────────────────────────
  filtrar(): void {
    let res = [...this.usuarios];

    if (this.busqueda.trim()) {
      const term = this.busqueda.toLowerCase();
      res = res.filter(u =>
        u.name.toLowerCase().includes(term) ||
        (u.email ?? '').toLowerCase().includes(term)
      );
    }

    if (this.filtroRol) {
      res = res.filter(u => this.getRolName(u) === this.filtroRol);
    }

    if (this.filtroEstado === 'activo')   res = res.filter(u => u.active);
    if (this.filtroEstado === 'inactivo') res = res.filter(u => !u.active);

    this.usuariosFiltrados = res;
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroRol = '';
    this.filtroEstado = '';
    this.filtrar();
  }

  calcularStats(): void {
    this.stats = {
      total:   this.usuarios.length,
      activos: this.usuarios.filter(u => u.active).length,
      admins:  this.usuarios.filter(u => this.getRolName(u) === 'Administrador').length,
      meseros: this.usuarios.filter(u => this.getRolName(u) === 'Mesero').length,
    };
  }

  // ── Modal ────────────────────────────────────────────────────────────────
  abrirModal(usuario?: Usuario): void {
    if (usuario) {
      this.editando = true;
      this.usuarioEditandoId = usuario._id;
      this.form = {
        name:     usuario.name,
        email:    usuario.email ?? '',
        password: '',         // nunca pre-rellenar contraseñas
        role:     typeof usuario.role === 'object' ? usuario.role._id : undefined,
        active:   usuario.active,
      };
    } else {
      this.editando = false;
      this.usuarioEditandoId = null;
      this.form = this.emptyForm();
    }
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────
  guardar(): void {
    if (this.editando && this.usuarioEditandoId) {
      // Al editar: solo enviar password si no está vacía
      const payload: any = {
        name:   this.form.name,
        email:  this.form.email,
        role:   this.form.role,
        active: this.form.active,
      };
      if (this.form.password.trim()) {
        payload.password = this.form.password;
      }
      this.usuariosService.update(this.usuarioEditandoId, payload).subscribe({
        next: () => { 
          this.alertService.toast('Usuario actualizado');
          this.cargarUsuarios(); 
          this.cerrarModal(); 
        },
        error: () => this.alertService.error('No se pudo actualizar el usuario')
      });
    } else {
      this.usuariosService.create({
        name:     this.form.name,
        email:    this.form.email,
        password: this.form.password,
        role:     this.form.role!,
        active:   this.form.active,
      }).subscribe({
        next: () => { 
          this.alertService.success('Usuario creado correctamente');
          this.cargarUsuarios(); 
          this.cerrarModal(); 
        },
        error: () => this.alertService.error('Error al crear el usuario')
      });
    }
  }

  async toggleActivo(usuario: Usuario): Promise<void> {
    const nuevoEstado = !usuario.active;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    const confirmar = await this.alertService.confirm(
      `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} usuario?`,
      `¿Estás seguro de que deseas ${accion} a "${usuario.name}"?`,
      nuevoEstado ? 'Sí, activar' : 'Sí, desactivar'
    );
    
    if (!confirmar) return;

    this.usuariosService.toggleActive(usuario._id, nuevoEstado).subscribe({
      next: () => {
        this.alertService.toast(`Usuario ${nuevoEstado ? 'activado' : 'desactivado'}`);
        this.cargarUsuarios();
      },
      error: () => this.alertService.error('Error al cambiar el estado del usuario')
    });
  }

  async eliminar(usuario: Usuario): Promise<void> {
    const confirmar = await this.alertService.confirm(
      'Eliminar Usuario',
      `¿Eliminar permanentemente al usuario "${usuario.name}"? Esta acción no se puede deshacer.`,
      'Sí, eliminar'
    );

    if (!confirmar) return;

    this.usuariosService.delete(usuario._id).subscribe({
      next: () => {
        this.alertService.success('Usuario eliminado permanentemente');
        this.cargarUsuarios();
      },
      error: () => this.alertService.error('No se pudo eliminar el usuario')
    });
  }

  // ── Helpers UI ────────────────────────────────────────────────────────────
  getRolName(u: Usuario): string {
    return this.usuariosService.getRoleName(u);
  }

  getRolClass(u: Usuario): string {
    const rol = this.getRolName(u).toLowerCase();
    if (rol.includes('admin'))  return 'role-admin';
    if (rol.includes('mesero')) return 'role-mesero';
    return 'role-other';
  }

  private emptyForm(): FormData {
    return { name: '', email: '', password: '', role: undefined, active: true };
  }
}
