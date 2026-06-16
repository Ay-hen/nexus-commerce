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

  popular = [
    {
      name: 'MacBook Pro M3',
      stars: 4.8,
      price: 1999,
      isNew: true,
      picture: '/products/macbook pro 13.png',
      likedBy: 513
    },
    {
      name: 'AirPods Pro',
      stars: 4.7,
      price: 249,
      isNew: false,
      picture: '/products/airpods pro.png',
      likedBy: 1200
    },
    {
      name: 'Apple Watch',
      stars: 4.6,
      price: 399,
      isNew: false,
      picture: '/products/appel watch.png',
      likedBy: 860
    }
  ];

}