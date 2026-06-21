import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

export type AuthState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.scss',
})
export class SignIn implements OnInit, OnDestroy {

  // ── Form ────────────────────────────────────────────────────────────────────
  form!: FormGroup;

  // ── UI State ────────────────────────────────────────────────────────────────
  authState    = signal<AuthState>('idle');
  showPassword = signal(false);
  errorMessage = signal('');

  // ── Floating orb animation ──────────────────────────────────────────────────
  private animFrame: number | null = null;
  floatOffset = signal(0);
  private startTime = 0;

  constructor(
    private fb: FormBuilder,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      email:      ['', [Validators.required, Validators.email]],
      password:   ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [false],
    });

    this.startTime = performance.now();
    this.animate();
  }

  ngOnDestroy(): void {
    if (this.animFrame !== null) cancelAnimationFrame(this.animFrame);
  }

  private animate(): void {
    this.animFrame = requestAnimationFrame((t) => {
      this.floatOffset.set(Math.sin((t - this.startTime) / 1800) * 14);
      this.animate();
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  get email()    { return this.form.get('email')!;    }
  get password() { return this.form.get('password')!; }

  fieldError(field: 'email' | 'password'): string {
    const ctrl = this.form.get(field)!;
    if (!ctrl.dirty || !ctrl.invalid) return '';
    if (ctrl.hasError('required')) return `${field === 'email' ? 'Email' : 'Password'} is required.`;
    if (field === 'email' && ctrl.hasError('email')) return 'Enter a valid email address.';
    if (field === 'password' && ctrl.hasError('minlength')) return 'Password must be at least 8 characters.';
    return '';
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.authState.set('loading');
    this.errorMessage.set('');

    try {
      // TODO: replace with real AuthService call
      // const { token } = await this.authService.signIn(this.form.value);
      // localStorage.setItem('nexus_token', token);
      await new Promise(resolve => setTimeout(resolve, 1400));

      this.authState.set('success');
      setTimeout(() => this.router.navigate(['/home']), 900);
    } catch (err: any) {
      this.authState.set('error');
      this.errorMessage.set(
        err?.error?.message ?? 'Invalid email or password. Please try again.'
      );
    }
  }

  // ── Social Auth (stubs) ───────────────────────────────────────────────────
  signInWithGoogle():   void { /* TODO: OAuth */ }
  signInWithGitHub():   void { /* TODO: OAuth */ }
  signInWithFacebook(): void { /* TODO: OAuth */ }

  navigateToSignUp(): void {
    this.router.navigate(['/signup']);
  }

  get isLoading(): boolean  { return this.authState() === 'loading'; }
  get isSuccess(): boolean  { return this.authState() === 'success'; }
  get hasError():  boolean  { return this.authState() === 'error';   }
}