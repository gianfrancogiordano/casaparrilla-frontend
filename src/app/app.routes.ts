import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MainComponent } from './layout/main/main.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { MeserosComponent } from './pages/meseros/meseros.component';
import { MesaDetalleComponent } from './pages/meseros/mesa-detalle/mesa-detalle.component';
import { TestPrinterComponent } from './pages/test-printer/test-printer.component';
import { InventarioComponent } from './pages/inventario/inventario.component';
import { ProductosComponent } from './pages/productos/productos.component';
import { PedidosComponent } from './pages/pedidos/pedidos.component';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';
import { ClientesComponent } from './pages/clientes/clientes.component';
import { DeliveryComponent } from './pages/delivery/delivery.component';
import { GastosComponent } from './pages/gastos/gastos.component';
import { CajaComponent } from './pages/caja/caja.component';
import { ReportesComponent } from './pages/reportes/reportes.component';
import { ComprasComponent } from './pages/compras/compras.component';
import { NominaComponent } from './pages/nomina/nomina.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'delivery', component: DeliveryComponent },
      { path: 'delivery/nuevo', loadComponent: () => import('./pages/delivery/nuevo/nuevo-delivery.component').then(m => m.NuevoDeliveryComponent) },
      { path: 'delivery/editar/:id', loadComponent: () => import('./pages/delivery/nuevo/nuevo-delivery.component').then(m => m.NuevoDeliveryComponent) },
      { path: 'meseros', component: MeserosComponent },
      { path: 'meseros/:numero', component: MesaDetalleComponent },
      { path: 'inventario', component: InventarioComponent },
      { path: 'productos', component: ProductosComponent },
      { path: 'pedidos', component: PedidosComponent },
      { path: 'caja', component: CajaComponent },
      { path: 'gastos', component: GastosComponent },
      { path: 'reportes', component: ReportesComponent },
      { path: 'compras', component: ComprasComponent },
      { path: 'nomina', component: NominaComponent },
      { path: 'usuarios', component: UsuariosComponent },
      { path: 'clientes', component: ClientesComponent },
      { path: 'test-printer', component: TestPrinterComponent },
      { path: 'configuracion', loadComponent: () => import('./pages/configuracion/configuracion.component').then(m => m.ConfiguracionComponent) },
      { path: 'inbox', loadComponent: () => import('./pages/inbox/inbox.component').then(m => m.InboxComponent) },
      { path: 'conocimiento', loadComponent: () => import('./pages/conocimiento/conocimiento.component').then(m => m.ConocimientoComponent) },

    ]
  },
  { path: '**', redirectTo: 'login', pathMatch: 'full' }
];

