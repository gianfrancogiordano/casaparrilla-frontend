import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, CurrentUser } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: string[];
  badgeCount?: number; // optional live badge (e.g. unread messages)
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent implements OnInit, OnDestroy {
  user: CurrentUser | null = null;
  inboxUnread = 0;
  private subs = new Subscription();

  // Definición central del menú — agrega aquí nuevas rutas
  readonly navItems: NavItem[] = [
    // ── Operación ──────────────────────────────────────────────────────────
    {
      label: 'Dashboard',
      icon: '📊',
      route: '/dashboard',
      roles: ['Administrador', 'Mesero'],
    },
    {
      label: 'Mesas',
      icon: '🪑',
      route: '/mesas',
      roles: ['Administrador', 'Mesero'],
    },
    {
      label: 'Monitor de Cocina',
      icon: '🍳',
      route: '/cocina',
      roles: ['Administrador', 'Cocina'],
    },
    {
      label: 'Delivery',
      icon: '🛵',
      route: '/delivery',
      roles: ['Administrador', 'Mesero'],
    },
    {
      label: 'Inbox WhatsApp',
      icon: '💬',
      route: '/inbox',
      roles: ['Administrador'],
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
      icon: '📦',
      route: '/inventario',
      roles: ['Administrador'],
    },
    // ── Finanzas (solo Admin) ─────────────────────────────────────────────
    {
      label: 'Caja',
      icon: '💰',
      route: '/caja',
      roles: ['Administrador'],
    },
    {
      label: 'Gastos',
      icon: '📤',
      route: '/gastos',
      roles: ['Administrador'],
    },
    {
      label: 'Reportes',
      icon: '📈',
      route: '/reportes',
      roles: ['Administrador'],
    },
    {
      label: 'Compras',
      icon: '🏪',
      route: '/compras',
      roles: ['Administrador'],
    },
    {
      label: 'Nómina',
      icon: '💼',
      route: '/nomina',
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
      label: 'Valentina IA',
      icon: '🧠',
      route: '/conocimiento',
      roles: ['Administrador'],
    },
    {
      label: 'Impresora',
      icon: '🖨️',
      route: '/test-printer',
      roles: ['Administrador', 'Mesero'],
    },
    {
      label: 'Configuración',
      icon: '⚙️',
      route: '/configuracion',
      roles: ['Administrador'],
    },
  ];

  constructor(public authService: AuthService, private socketService: SocketService) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    // Listen for unread count updates from chat sessions
    this.subs.add(
      this.socketService.onChatSessionUpdated().subscribe((session: any) => {
        // Re-calculate total unread from latest session data if available
        if (session?.unreadCount !== undefined) {
          // Simple approach: just increment/reset based on session event
          this.inboxUnread = session.unreadCount > 0 ? this.inboxUnread + session.unreadCount : Math.max(0, this.inboxUnread - 1);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
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
    const operacion = ['Dashboard', 'Mesas', 'Monitor de Cocina', 'Delivery', 'Pedidos', 'Inbox WhatsApp'];
    return this.menuItems.filter((i) => operacion.includes(i.label));
  }

  /** Items de gestión visibles */
  get gestionItems(): NavItem[] {
    const gestion = ['Productos', 'Inventario'];
    return this.menuItems.filter((i) => gestion.includes(i.label));
  }

  /** Items de finanzas visibles */
  get finanzasItems(): NavItem[] {
    const finanzas = ['Caja', 'Gastos', 'Reportes', 'Compras', 'Nómina'];
    return this.menuItems.filter((i) => finanzas.includes(i.label));
  }

  /** Items de configuración visibles */
  get configItems(): NavItem[] {
    const config = ['Usuarios', 'Clientes VIP', 'Valentina IA', 'Impresora', 'Configuración'];
    return this.menuItems.filter((i) => config.includes(i.label));
  }

  logout(): void {
    this.authService.logout();
  }
}
