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
import { DeliveryComponent } from './pages/delivery/delivery.component'; // Import DeliveryComponent
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
      { path: 'meseros', component: MeserosComponent },
      { path: 'meseros/:numero', component: MesaDetalleComponent },
      { path: 'inventario', component: InventarioComponent },
      { path: 'productos', component: ProductosComponent },
      { path: 'pedidos', component: PedidosComponent },
      { path: 'usuarios', component: UsuariosComponent },
      { path: 'clientes', component: ClientesComponent },
      { path: 'test-printer', component: TestPrinterComponent },
    ]
  },
  { path: '**', redirectTo: 'login', pathMatch: 'full' }
];
