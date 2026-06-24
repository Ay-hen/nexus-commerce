import {
  Component,
  signal,
  OnInit,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Footer } from "../footer/footer";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ContactCard {
  id: number;
  icon: string;
  title: string;
  description: string;
  value: string;
  sub?: string;
  action: string;
  actionHref: string;
  accentColor: string;
}

export interface BusinessDay {
  day: string;
  hours: string;
  isOpen: boolean;
  isCurrent: boolean;
}

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  open: boolean;
}

export interface SocialLink {
  id: number;
  name: string;
  handle: string;
  followers: string;
  icon: string;
  color: string;
  bgColor: string;
  href: string;
}

export type FormStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ContactForm {
  fullName: string;
  email: string;
  subject: string;
  message: string;
}


@Component({
  selector: 'app-contact',
  imports: [Footer],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})


export class Contact implements OnInit, OnDestroy {

  // ── Form state ───────────────────────────────────────────────────────────────
  form: ContactForm = {
    fullName: '',
    email: '',
    subject: '',
    message: '',
  };

  formStatus = signal<FormStatus>('idle');
  messageFocused = signal(false);
  private submitTimer: ReturnType<typeof setTimeout> | null = null;

  readonly messageMaxLength = 500;

  get messageCharCount(): number {
    return this.form.message.length;
  }

  get messageProgress(): number {
    return (this.messageCharCount / this.messageMaxLength) * 100;
  }

  // ── FAQ ──────────────────────────────────────────────────────────────────────
  faqs: FaqItem[] = [
    {
      id: 1,
      question: 'How can I track my order?',
      answer: 'Once your order ships, you\'ll receive a confirmation email with a tracking number. You can also visit the "My Orders" section in your account to see real-time updates on your shipment.',
      open: false,
    },
    {
      id: 2,
      question: 'How long does delivery take?',
      answer: 'Standard delivery takes 3–5 business days. Express shipping (1–2 days) is available at checkout. International orders typically arrive within 7–14 business days depending on the destination.',
      open: false,
    },
    {
      id: 3,
      question: 'Can I return a product?',
      answer: 'Yes — we offer a 30-day hassle-free return window. Items must be in their original condition and packaging. Simply initiate a return from your account dashboard and we\'ll arrange a pickup.',
      open: false,
    },
    {
      id: 4,
      question: 'How do refunds work?',
      answer: 'Once we receive and inspect your return, refunds are processed within 2–3 business days. The amount will be credited back to your original payment method. You\'ll get an email confirmation when it\'s done.',
      open: false,
    },
    {
      id: 5,
      question: 'Do you offer price matching?',
      answer: 'We do! If you find the same product at a lower price from an authorized retailer within 14 days of your purchase, contact us and we\'ll match the difference — no questions asked.',
      open: false,
    },
  ];

  // ── Contact cards ────────────────────────────────────────────────────────────
  contactCards: ContactCard[] = [
    {
      id: 1,
      icon: 'email',
      title: 'Email Support',
      description: 'Drop us a line and we\'ll get back to you within a few hours.',
      value: 'support@nexus.store',
      sub: 'Avg. response: 2 hours',
      action: 'Send Email',
      actionHref: 'mailto:support@nexus.store',
      accentColor: '#EFF5FF',
    },
    {
      id: 2,
      icon: 'phone',
      title: 'Phone Support',
      description: 'Speak directly with one of our product specialists.',
      value: '+212 788-561202',
      sub: 'Mon–Fri, 9am–6pm EST',
      action: 'Call Now',
      actionHref: 'tel:+212788561202',
      accentColor: '#EDFFF5',
    },
    {
      id: 3,
      icon: 'location',
      title: 'Headquarters',
      description: 'Visit our flagship showroom and experience Nexus in person.',
      value: '340 Pine Street, Suite 800',
      sub: 'San Francisco, CA 94104',
      action: 'Get Directions',
      actionHref: 'https://maps.google.com',
      accentColor: '#FFF7ED',
    },
    
  ];

  // ── Business hours ────────────────────────────────────────────────────────────
  businessHours: BusinessDay[] = [];

  private buildBusinessHours(): BusinessDay[] {
    const today = new Date().getDay(); // 0 = Sunday
    return [
      { day: 'Monday',    hours: '9:00 AM – 6:00 PM', isOpen: true,  isCurrent: today === 1 },
      { day: 'Tuesday',   hours: '9:00 AM – 6:00 PM', isOpen: true,  isCurrent: today === 2 },
      { day: 'Wednesday', hours: '9:00 AM – 6:00 PM', isOpen: true,  isCurrent: today === 3 },
      { day: 'Thursday',  hours: '9:00 AM – 6:00 PM', isOpen: true,  isCurrent: today === 4 },
      { day: 'Friday',    hours: '9:00 AM – 5:00 PM', isOpen: true,  isCurrent: today === 5 },
      { day: 'Saturday',  hours: 'Closed', isOpen: false, isCurrent: today === 6 },
      { day: 'Sunday',    hours: 'Closed',             isOpen: false, isCurrent: today === 0 },
    ];
  }

  // ── Social links ──────────────────────────────────────────────────────────────
  socialLinks: SocialLink[] = [
    {
      id: 1,
      name: 'Facebook',
      handle: '@NexusStore',
      followers: '48K followers',
      icon: '/icons/facebook.png',
      color: '#1877F2',
      bgColor: '#EEF4FF',
      href: 'https://facebook.com',
    },
    {
      id: 2,
      name: 'Instagram',
      handle: '@nexus.store',
      followers: '126K followers',
      icon: '/icons/instagram.png',
      color: '#E1306C',
      bgColor: '#FFF0F5',
      href: 'https://instagram.com',
    },
    {
      id: 3,
      name: 'Whatsapp',
      handle: 'Nexus Technology',
      followers: '',
      icon: '/icons/whatsapp.png',
      color: '#70e000',
      bgColor: '#EEF5FF',
      href: '#',
    },
    {
      id: 4,
      name: 'TikTok',
      handle: '@NexusHQ',
      followers: '59K followers',
      icon: '/icons/tiktok.png',
      color: '#0A0A0B',
      bgColor: '#F3F4F6',
      href: 'https://x.com',
    },
  ];

  // ── Private ──────────────────────────────────────────────────────────────────
  private loadingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private router: Router) {}

  // ─── Lifecycle ───────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.businessHours = this.buildBusinessHours();
  }

  ngOnDestroy(): void {
    if (this.loadingTimer) clearTimeout(this.loadingTimer);
    if (this.submitTimer) clearTimeout(this.submitTimer);
  }

  // ─── Form actions ─────────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.formStatus() === 'loading') return;
    if (!this.isFormValid()) return;

    this.formStatus.set('loading');

    // Simulate API call
    this.submitTimer = setTimeout(() => {
      // 90% success rate simulation
      const success = Math.random() > 0.1;
      this.formStatus.set(success ? 'success' : 'error');
    }, 1800);
  }

  resetForm(): void {
    this.form = { fullName: '', email: '', subject: '', message: '' };
    this.formStatus.set('idle');
  }

  isFormValid(): boolean {
    return (
      this.form.fullName.trim().length > 1 &&
      this.isEmailValid(this.form.email) &&
      this.form.subject.trim().length > 1 &&
      this.form.message.trim().length > 9
    );
  }

  isEmailValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ─── FAQ actions ──────────────────────────────────────────────────────────────
  toggleFaq(item: FaqItem): void {
    // Close others, toggle clicked
    this.faqs.forEach(f => {
      if (f.id !== item.id) f.open = false;
    });
    item.open = !item.open;
  }

  // ─── Navigation ───────────────────────────────────────────────────────────────
  goHome(): void {
    this.router.navigate(['/home']);
  }

  goProducts(): void {
    this.router.navigate(['/products']);
  }

  // ─── Keyboard ────────────────────────────────────────────────────────────────
  @HostListener('keydown.escape')
  onEscape(): void {
    if (this.formStatus() === 'success' || this.formStatus() === 'error') {
      this.resetForm();
    }
  }

  // ─── Track functions ──────────────────────────────────────────────────────────
  trackById(_: number, item: ContactCard | FaqItem | SocialLink | BusinessDay): number | string {
    return (item as any).id ?? (item as BusinessDay).day;
  }
}