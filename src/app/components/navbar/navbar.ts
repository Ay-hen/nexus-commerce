import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [
    RouterLink,
    RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  icons = {
      shopping: 'icons/icons8-buying-96.png',
      like: 'icons/icons8-heart 100.png',
      notification: 'icons/icons8-notification-96.png',
      search: 'icons/icons8-search-96.png'
  };
  notification = 3;
  buy = 0;
}
