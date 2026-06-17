import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, Navbar],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements AfterViewInit, OnDestroy {

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



@ViewChild('popularGrid') popularGrid!: ElementRef;

  showLeft = false;
  showRight = false;


  updateArrows() {
    const el = this.popularGrid.nativeElement;

    this.showLeft = el.scrollLeft > 0;

    this.showRight = el.scrollLeft + el.clientWidth < el.scrollWidth;
  }

  scrollLeft() {
  const el = this.popularGrid.nativeElement;
  el.scrollBy({ left: -400, behavior: 'smooth' });

  setTimeout(() => this.updateArrows(), 300);
}

scrollRight() {
  const el = this.popularGrid.nativeElement;
  el.scrollBy({ left: 400, behavior: 'smooth' });

  setTimeout(() => this.updateArrows(), 300);
}

  onScroll() {
  this.updateArrows();
}

  private intervalId: any;

  ngAfterViewInit() {
    this.startAutoScroll();
  }

  startAutoScroll() {
    const el = this.popularGrid.nativeElement;

    this.intervalId = setInterval(() => {
      const maxScroll = el.scrollWidth - el.clientWidth;

      if (el.scrollLeft >= maxScroll - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: 320, behavior: 'smooth' });
      }
    }, 2500); // every 2.5s
  }

  isPaused = false;

pauseScroll() {
  this.isPaused = true;
}

resumeScroll() {
  this.isPaused = false;
}

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }

  displayedPopular = [...this.popular, ...this.popular];
}