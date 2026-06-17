import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from "../navbar/navbar";

export interface Product {
  id: number;
  brand: string;
  name: string;
  rating: number;
  reviewCount: number;
  price: number;
  originalPrice: number;
  discount: number;
  badge?: 'new' | 'sale' | null;
  image: string;
  bgColor: string;
  liked: boolean;
  category: string;
}

type SortOption = 'Popular' | 'Price: Low to High' | 'Price: High to Low' | 'Newest' | 'Top Rated';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, Navbar],
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class Products {

  categories = ['All', 'Electronics', 'Fashion', 'Gaming', 'Shoes', 'Watches'];
  sortOptions: SortOption[] = ['Popular', 'Price: Low to High', 'Price: High to Low', 'Newest', 'Top Rated'];

  activeCategory = signal('All');
  activeSort = signal<SortOption>('Popular');
  visibleCount = signal(4);
  sortDropdownOpen = signal(false);

  allProducts: Product[] = [
    {
      id: 1,
      brand: 'Sony',
      name: 'WH-XM6 Wireless ANC',
      rating: 4.5,
      reviewCount: 2148,
      price: 249,
      originalPrice: 350,
      discount: Math.round(((350 - 249) / 350) * 100),
      badge: 'new',
      image: '/products/headphones.png',
      bgColor: 'rgb(238, 240, 248)',
      liked: false,
      category: 'Electronics',
    },
    {
      id: 2,
      brand: 'Apple',
      name: 'Ultra Watch Series 3',
      rating: 4.7,
      reviewCount: 876,
      price: 189,
      originalPrice: 315,
      discount: 40,
      badge: 'sale',
      image: '/products/appel watch.png',
      bgColor: '#f0eef8',
      liked: false,
      category: 'Watches',
    },
    {
      id: 3,
      brand: 'Apple',
      name: 'AirPods Pro 2nd Gen',
      rating: 4.9,
      reviewCount: 3412,
      price: 199,
      originalPrice: 249,
      discount: 20,
      badge: 'new',
      image: '/products/airpods pro.png',
      bgColor: '#eef8f2',
      liked: false,
      category: 'Electronics',
    },
    {
      id: 4,
      brand: 'Apple',
      name: 'MacBook Pro M3',
      rating: 4.8,
      reviewCount: 513,
      price: 1999,
      originalPrice: 2199,
      discount: 9,
      badge: null,
      image: '/products/macbook pro 13.png',
      bgColor: '#f8f5ee',
      liked: false,
      category: 'Electronics',
    },
    {
      id: 5,
      brand: 'Samsung',
      name: 'Galaxy S24 Ultra',
      rating: 4.7,
      reviewCount: 1890,
      price: 1099,
      originalPrice: 1299,
      discount: 15,
      badge: 'sale',
      image: '/products/phone.png',
      bgColor: '#f0f8fe',
      liked: false,
      category: 'Electronics',
    },
    {
      id: 6,
      brand: 'Nike',
      name: 'Air Max 270',
      rating: 4.6,
      reviewCount: 742,
      price: 129,
      originalPrice: 160,
      discount: 19,
      badge: null,
      image: '/products/shoes.png',
      bgColor: '#fff3ee',
      liked: false,
      category: 'Shoes',
    },
  ];

  filteredProducts = computed(() => {
    let list = this.activeCategory() === 'All'
      ? [...this.allProducts]
      : this.allProducts.filter(p => p.category === this.activeCategory());

    switch (this.activeSort()) {
      case 'Price: Low to High':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'Price: High to Low':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'Top Rated':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'Newest':
        list = list.filter(p => p.badge === 'new').concat(list.filter(p => p.badge !== 'new'));
        break;
      default:
        list.sort((a, b) => b.reviewCount - a.reviewCount);
    }

    return list;
  });

  visibleProducts = computed(() =>
    this.filteredProducts().slice(0, this.visibleCount())
  );

  hasMore = computed(() =>
    this.visibleCount() < this.filteredProducts().length
  );

  setCategory(cat: string) {
    this.activeCategory.set(cat);
    this.visibleCount.set(4);
  }

  setSort(option: SortOption) {
    this.activeSort.set(option);
    this.sortDropdownOpen.set(false);
    this.visibleCount.set(4);
  }

  toggleSort() {
    this.sortDropdownOpen.update(v => !v);
  }

  loadMore() {
    this.visibleCount.update(n => n + 4);
  }

  toggleLike(product: Product) {
    product.liked = !product.liked;
  }

  getStars(rating: number): ('full' | 'half' | 'empty')[] {
    const stars: ('full' | 'half' | 'empty')[] = [];
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) stars.push('full');
      else if (rating >= i - 0.5) stars.push('half');
      else stars.push('empty');
    }
    return stars;
  }
}