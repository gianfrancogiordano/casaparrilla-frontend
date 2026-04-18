import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { PushNotificationsService } from '../../services/push-notifications.service';

@Component({
  selector: 'app-push-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="push-banner" *ngIf="showBanner" [@slideDown]>
      <div class="push-banner__icon">🔔</div>
      <div class="push-banner__text">
        <strong>Activa las notificaciones</strong>
        <span>Recibe alertas inmediatas cuando llegue un nuevo pedido de delivery.</span>
      </div>
      <div class="push-banner__actions">
        <button class="btn-activate" (click)="requestPermission()" [disabled]="loading">
          {{ loading ? 'Activando...' : 'Activar' }}
        </button>
        <button class="btn-dismiss" (click)="dismissBanner()" title="Cerrar">✕</button>
      </div>
    </div>
  `,
  styles: [`
    .push-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: #f1f5f9;
      padding: 0.85rem 1.25rem;
      border-bottom: 2px solid rgba(99, 102, 241, 0.5);
      animation: slideDown 0.4s ease-out;
    }

    @keyframes slideDown {
      from { transform: translateY(-100%); opacity: 0; }
      to   { transform: translateY(0);     opacity: 1; }
    }

    .push-banner__icon {
      font-size: 1.5rem;
      flex-shrink: 0;
      animation: ring 1.5s ease-in-out infinite;
    }

    @keyframes ring {
      0%, 100% { transform: rotate(0); }
      10%      { transform: rotate(14deg); }
      20%      { transform: rotate(-14deg); }
      30%      { transform: rotate(10deg); }
      40%      { transform: rotate(-8deg); }
      50%      { transform: rotate(0); }
    }

    .push-banner__text {
      flex: 1;
      min-width: 0;
    }

    .push-banner__text strong {
      display: block;
      font-size: 0.9rem;
      margin-bottom: 0.1rem;
    }

    .push-banner__text span {
      font-size: 0.78rem;
      color: #94a3b8;
    }

    .push-banner__actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .btn-activate {
      background: linear-gradient(135deg, #6366f1, #818cf8);
      color: white;
      border: none;
      padding: 0.5rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .btn-activate:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }

    .btn-activate:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-dismiss {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 1rem;
      padding: 0.25rem;
      line-height: 1;
      transition: color 0.2s;
    }

    .btn-dismiss:hover { color: #f1f5f9; }

    @media (max-width: 576px) {
      .push-banner {
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
      }
      .push-banner__text span { display: none; }
      .push-banner__actions { margin-left: auto; }
    }
  `],
})
export class PushBannerComponent implements OnInit {
  showBanner = false;
  loading = false;

  constructor(
    private authService: AuthService,
    private pushService: PushNotificationsService,
  ) {}

  ngOnInit(): void {
    // Solo mostrar a Admins y Meseros
    if (!this.authService.isAdmin() && !this.authService.isMesero()) return;

    // Si ya fue descartado en esta sesión, no mostrar
    if (sessionStorage.getItem('push_banner_dismissed') === 'true') return;

    // Si ya tiene token registrado, no mostrar
    if (localStorage.getItem('admin_fcm_token')) return;

    // Si las notificaciones ya están concedidas y tenemos token, no mostrar
    if ('Notification' in window && Notification.permission === 'granted' && localStorage.getItem('admin_fcm_token')) return;

    // Si las notificaciones fueron explícitamente denegadas, no mostrar (el usuario ya decidió)
    if ('Notification' in window && Notification.permission === 'denied') return;

    // Mostrar el banner
    this.showBanner = true;
  }

  async requestPermission(): Promise<void> {
    this.loading = true;
    try {
      await this.pushService.initAndRequestPermission();
      // Si se obtuvo token, ocultar banner
      if (localStorage.getItem('admin_fcm_token')) {
        this.showBanner = false;
      }
    } catch (err) {
      console.error('[PushBanner] Error:', err);
    } finally {
      this.loading = false;
    }
  }

  dismissBanner(): void {
    this.showBanner = false;
    sessionStorage.setItem('push_banner_dismissed', 'true');
  }
}
