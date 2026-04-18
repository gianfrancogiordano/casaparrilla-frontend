import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PushNotificationsService, PushNotification } from '../../services/push-notifications.service';
import { SocketService } from '../../services/socket.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="push-toast-container">
      <div
        *ngFor="let n of visible; trackBy: trackById"
        class="push-toast"
        [class.push-toast--entering]="n.entering"
        (click)="goToDelivery()"
      >
        <div class="push-toast__icon">🛵</div>
        <div class="push-toast__content">
          <p class="push-toast__title">{{ n.title }}</p>
          <p class="push-toast__body">{{ n.body }}</p>
        </div>
        <button class="push-toast__close" (click)="dismiss(n.id, $event)">✕</button>
      </div>
    </div>
  `,
  styles: [`
    .push-toast-container {
      position: fixed;
      top: 1.25rem;
      right: 1.25rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: .75rem;
      pointer-events: none;
    }

    .push-toast {
      display: flex;
      align-items: center;
      gap: .75rem;
      background: #1a1a2e;
      color: #f1f5f9;
      border: 1px solid rgba(99, 102, 241, 0.4);
      border-radius: 14px;
      padding: .9rem 1.1rem;
      min-width: 280px;
      max-width: 360px;
      box-shadow: 0 8px 32px rgba(0,0,0,.35);
      cursor: pointer;
      pointer-events: all;
      transform: translateX(120%);
      opacity: 0;
      transition: transform .4s cubic-bezier(.34,1.56,.64,1), opacity .3s ease;
    }

    .push-toast--entering {
      transform: translateX(0);
      opacity: 1;
    }

    .push-toast__icon {
      font-size: 1.6rem;
      flex-shrink: 0;
    }

    .push-toast__content { flex: 1; min-width: 0; }

    .push-toast__title {
      font-weight: 700;
      font-size: .875rem;
      margin: 0 0 .15rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .push-toast__body {
      font-size: .75rem;
      color: #94a3b8;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .push-toast__close {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: .8rem;
      padding: .2rem;
      flex-shrink: 0;
      line-height: 1;
    }

    .push-toast__close:hover { color: #f1f5f9; }
  `],
})
export class NotificationToastComponent implements OnInit, OnDestroy {
  visible: Array<PushNotification & { id: number; entering: boolean }> = [];
  private counter = 0;
  private pushSub: Subscription | null = null;
  private socketSub: Subscription | null = null;
  private readonly AUTO_DISMISS_MS = 6000;

  constructor(
    private pushService: PushNotificationsService,
    private socketService: SocketService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // 1. Escuchar notificaciones Push (FCM)
    this.pushSub = this.pushService.notification$.subscribe(n => {
      if (!n) return;
      this.show(n);
    });

    // 2. Escuchar WebSockets (garantiza recibirlo aunque FCM falle/esté bloqueado)
    this.socketSub = this.socketService.onOrderCreated().subscribe((order: any) => {
      if (order.orderType === 'Delivery') {
        const clientName = order.clientId?.name || order.customerPhone || 'Cliente';
        const n: PushNotification = {
          title: '🛵 Nuevo Delivery Recibido',
          body: `${clientName} — ${order.deliveryAddress || 'Sin dirección'}`,
          timestamp: new Date()
        };
        // Mostrar visualmente
        this.show(n);
        // Alertar por voz
        this.playAudioNotification();
      }
    });
  }

  ngOnDestroy(): void {
    this.pushSub?.unsubscribe();
    this.socketSub?.unsubscribe();
  }

  private playAudioNotification() {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Atención, ha llegado un nuevo pedido de delivery');
      utterance.lang = 'es-ES';
      utterance.rate = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }

  private show(n: PushNotification): void {
    const id = ++this.counter;
    const item = { ...n, id, entering: false };
    this.visible.push(item);

    // Activar animación de entrada
    requestAnimationFrame(() => {
      const idx = this.visible.findIndex(x => x.id === id);
      if (idx !== -1) this.visible[idx].entering = true;
    });

    // Auto-dismiss
    setTimeout(() => this.dismiss(id), this.AUTO_DISMISS_MS);
  }

  dismiss(id: number, event?: Event): void {
    event?.stopPropagation();
    this.visible = this.visible.filter(n => n.id !== id);
  }

  goToDelivery(): void {
    this.router.navigate(['/delivery']);
  }

  trackById(_: number, item: { id: number }): number {
    return item.id;
  }
}
