import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { PushNotificationsService } from '../../services/push-notifications.service';

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
        // Pedir permiso de notificaciones AQUÍ — el click del botón login
        // es el gesto de usuario que los navegadores requieren
        if (this.authService.isAdmin() || this.authService.isMesero()) {
          this.pushService.initAndRequestPermission();
        }
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage =
          err?.error?.message ?? 'Error al conectar con el servidor. Intenta de nuevo.';
      },
    });
  }
}
