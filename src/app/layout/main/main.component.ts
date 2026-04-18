import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { PushBannerComponent } from '../../components/push-banner/push-banner.component';

@Component({
  selector: 'app-main',
  imports: [RouterOutlet, SidebarComponent, NavbarComponent, PushBannerComponent],
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss'
})
export class MainComponent {

}
