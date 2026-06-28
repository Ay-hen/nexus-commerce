import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NotificationComponent } from "../notification/notification";

@Component({
  selector: 'app-navbar',
  imports: [
    RouterLink,
    RouterLinkActive,
    NotificationComponent
],
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
  buy = 2;

  constructor(private router : Router){}
  signIn() : void{
    this.router.navigate(['/sign-in']);
  }

  toCart():void {
    this.router.navigate(['/cart']);
  }
}
