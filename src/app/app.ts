import { Component, signal } from '@angular/core';
import { Footer } from "./components/footer/footer";
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [ Footer, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('nexus-commerce');
}
