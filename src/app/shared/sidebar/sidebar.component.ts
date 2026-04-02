import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, CurrentUser } from '../../services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: string[]; // roles que pueden ver este item ('*' = todos)
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent implements OnInit {
  user: CurrentUser | null = null;

  // Definición central del menú — agrega aquí nuevas rutas
  readonly navItems: NavItem[] = [
    // ── Operación ──────────────────────────────────────────────────────────
    {
      label: 'Dashboard',
      icon: '📊',
      route: '/dashboard',
      roles: ['Administrador'],
    },
    {
      label: 'Meseros',
      icon: '🍽️',
      route: '/meseros',
      roles: ['Administrador', 'Mesero'],
    },
    {
      label: 'Pedidos',
      icon: '🛒',
      route: '/pedidos',
      roles: ['Administrador', 'Mesero'],
    },
    // ── Gestión (solo Admin) ───────────────────────────────────────────────
    {
      label: 'Productos',
      icon: '🥩',
      route: '/productos',
      roles: ['Administrador'],
    },
    {
      label: 'Inventario',
      icon: '📋',
      route: '/inventario',
      roles: ['Administrador'],
    },
    // ── Configuración (solo Admin) ─────────────────────────────────────────
    {
      label: 'Usuarios',
      icon: '👥',
      route: '/usuarios',
      roles: ['Administrador'],
    },
    {
      label: 'Clientes VIP',
      icon: '⭐',
      route: '/clientes',
      roles: ['Administrador'],
    },
    {
      label: 'Impresora',
      icon: '🖨️',
      route: '/test-printer',
      roles: ['Administrador'],
    },
  ];

  constructor(public authService: AuthService) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
  }

  /** Filtra los items del menú según el rol del usuario */
  get menuItems(): NavItem[] {
    const role = this.user?.role ?? '';
    return this.navItems.filter((item) => item.roles.includes(role));
  }

  /** Secciones con header — devuelve si hay al menos 1 item admin de gestión visible */
  get showGestionSection(): boolean {
    return this.authService.isAdmin();
  }

  /** Items de operación visibles */
  get operacionItems(): NavItem[] {
    const operacion = ['Dashboard', 'Meseros', 'Pedidos'];
    return this.menuItems.filter((i) => operacion.includes(i.label));
  }

  /** Items de gestión visibles */
  get gestionItems(): NavItem[] {
    const gestion = ['Productos', 'Inventario'];
    return this.menuItems.filter((i) => gestion.includes(i.label));
  }

  /** Items de configuración visibles */
  get configItems(): NavItem[] {
    const config = ['Usuarios', 'Clientes VIP', 'Impresora'];
    return this.menuItems.filter((i) => config.includes(i.label));
  }

  logout(): void {
    this.authService.logout();
  }
}
