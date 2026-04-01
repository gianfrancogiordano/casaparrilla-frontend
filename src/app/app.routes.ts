import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MainComponent } from './layout/main/main.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { MeserosComponent } from './pages/meseros/meseros.component';
import { MesaDetalleComponent } from './pages/meseros/mesa-detalle/mesa-detalle.component';
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
      { path: 'meseros', component: MeserosComponent },
      { path: 'meseros/:numero', component: MesaDetalleComponent },
    ]
  },
  { path: '**', redirectTo: 'login', pathMatch: 'full' }
];
