import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NotificationComponent } from "../notification/notification";
import { Auth } from '../../auth/auth';
import { AccountData } from '../../services/account-data';

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
  protected auth = inject(Auth);
  protected data = inject(AccountData);

  icons = {
      shopping: 'icons/icons8-buying-96.png',
      like: 'icons/icons8-heart 100.png',
      notification: 'icons/icons8-notification-96.png',
      search: 'icons/icons8-search-96.png'
  };

  constructor(private router : Router){}

  signIn() : void{
    this.router.navigate(['/sign-in']);
  }

  signOut(): void {
    this.auth.logout();           // AccountData clears itself when the session ends
    this.router.navigate(['/home']);
  }

  toCart():void {
    this.router.navigate(['/cart']);
  }

  toFavorites(): void {
    this.router.navigate(['/favorites']);
  }
}