import { Component, signal } from '@angular/core';
import { Home } from "./components/home/home";
import { Footer } from "./components/footer/footer";

@Component({
  selector: 'app-root',
  imports: [Home, Footer],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('nexus-commerce');
}
