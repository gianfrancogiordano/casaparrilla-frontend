import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { PushNotificationsService } from '../../services/push-notifications.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private pushService: PushNotificationsService,
    private alertService: AlertService,
  ) {
    this.loginForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const { name, password } = this.loginForm.value;

    this.authService.login(name, password).subscribe({
      next: () => {
        this.isLoading = false;
        
        // Si es Admin o Mesero, mostramos un diálogo explícito para que el click del usuario 
        // habilite el contexto necesario para pedir el permiso de notificaciones PUSH WEB.
        if (this.authService.isAdmin() || this.authService.isMesero()) {
          this.alertService.confirm(
            'Notificaciones Web',
            'Para que tu dispositivo te alerte inmediatamente de los nuevos pedidos, necesitamos que apruebes las notificaciones PUSH web a continuación.',
            'Activar Notificaciones'
          ).then((accepted) => {
            if (accepted) {
              this.pushService.initAndRequestPermission();
            }
            this.router.navigate(['/']);
          });
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage =
          err?.error?.message ?? 'Error al conectar con el servidor. Intenta de nuevo.';
      },
    });
  }
}
