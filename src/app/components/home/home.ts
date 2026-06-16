import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, Navbar],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {

  icons = {
    shield: '/icons/shield.png',
    truck: '/icons/truck.png',
    headset: '/icons/headset.png'
  };

  categories = [
    {
      name: 'Laptops',
      desc: 'High performance for every need',
      image: '/categories/laptop.jfif'
    },
    {
      name: 'Audio',
      desc: 'Premium sound experience',
      image: '/categories/headphones.png'
    },
    {
      name: 'Wearables',
      desc: 'Technology that moves with you',
      image: '/categories/watch.png'
    },
    {
      name: 'Smartphones',
      desc: 'Innovation in your hands',
      image: '/categories/phone.png'
    },
    {
      name: 'Clothes',
      desc: 'Trendy fashion for every style',
      image: '/categories/clothes.png'
    }
  ];

}