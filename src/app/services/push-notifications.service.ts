import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class PushNotificationsService implements OnDestroy {
  private app: FirebaseApp | null    = null;
  private messaging: Messaging | null = null;
  private unsubscribeForeground: (() => void) | null = null;

  // Observable para que el componente toast escuche notificaciones en foreground
  private notificationSubject = new BehaviorSubject<PushNotification | null>(null);
  notification$ = this.notificationSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Inicializa Firebase, registra el SW, pide permiso y suscribe al topic admin-deliveries.
   * Llamar solo si el usuario es Admin o Mesero.
   */
  async initAndRequestPermission(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      console.warn('[Push] Service Workers o Notifications no soportados en este navegador.');
      return;
    }

    try {
      // Inicializar Firebase App (evitar duplicados)
      this.app = getApps().length
        ? getApps()[0]
        : initializeApp(environment.firebase);

      this.messaging = getMessaging(this.app);

      // Registrar el SW de Firebase manualmente
      const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;

      // Pedir permiso de notificaciones
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('[Push] Permiso de notificaciones denegado.');
        return;
      }

      // Obtener token FCM
      const token = await getToken(this.messaging, {
        vapidKey: environment.vapidKey,
        serviceWorkerRegistration: swRegistration,
      });

      if (!token) {
        console.warn('[Push] No se pudo obtener el token FCM.');
        return;
      }

      // Guardar token localmente
      localStorage.setItem('admin_fcm_token', token);

      // Suscribir al topic 'admin-deliveries' en el backend
      await this.subscribeToAdminTopic(token);

      // Escuchar mensajes en foreground
      this.listenForeground();

      console.log('[Push] Admin suscrito a notificaciones de delivery ✅');
    } catch (err) {
      console.error('[Push] Error al inicializar notificaciones:', err);
    }
  }

  /**
   * Suscribe el token FCM al topic 'admin-deliveries' vía el backend
   */
  private async subscribeToAdminTopic(token: string): Promise<void> {
    try {
      await this.http.post(`${environment.apiUrl.replace('/api', '')}/notifications/subscribe`, { token }).toPromise();
    } catch (err) {
      console.error('[Push] Error al suscribir al topic:', err);
    }
  }

  /**
   * Escucha mensajes cuando la app está en foreground (pestaña activa)
   */
  private listenForeground(): void {
    if (!this.messaging) return;
    this.unsubscribeForeground = onMessage(this.messaging, (payload) => {
      const notification: PushNotification = {
        title: payload.notification?.title ?? 'Nuevo aviso',
        body:  payload.notification?.body  ?? '',
        data:  payload.data as Record<string, string>,
        timestamp: new Date(),
      };
      this.notificationSubject.next(notification);
    });
  }

  /**
   * Desuscribir al hacer logout
   */
  async logout(): Promise<void> {
    const token = localStorage.getItem('admin_fcm_token');
    if (token) {
      try {
        await this.http.delete(`${environment.apiUrl.replace('/api', '')}/notifications/unsubscribe`, { body: { token } }).toPromise();
      } catch (_) {}
      localStorage.removeItem('admin_fcm_token');
    }
    this.unsubscribeForeground?.();
  }

  ngOnDestroy(): void {
    this.unsubscribeForeground?.();
  }
}
