import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { PushNotificationsService } from './services/push-notifications.service';
import { NotificationToastComponent } from './components/notification-toast/notification-toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'frontend';

  constructor(
    private authService: AuthService,
    private pushService: PushNotificationsService,
  ) {}

  ngOnInit(): void {
    // Iniciar push notifications si el usuario es Admin o Mesero
    const user = this.authService.getCurrentUser();
    if (user && (this.authService.isAdmin() || this.authService.isMesero())) {
      this.pushService.initAndRequestPermission();
    }
  }
}
