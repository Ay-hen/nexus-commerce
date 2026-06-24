import { Component, signal } from '@angular/core';
import { Footer } from "./components/footer/footer";
import { RouterOutlet } from '@angular/router';
import { AuthModal } from "./components/auth-modal/auth-modal";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AuthModal],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('nexus-commerce');
}
