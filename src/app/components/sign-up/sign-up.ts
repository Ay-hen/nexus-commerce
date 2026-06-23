import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';



export type AuthState = 'idle' | 'loading' | 'success' | 'error';
 
// ─── Custom Validators ─────────────────────────────────────────────────────────
 
/** Passwords match cross-field validator (attach to FormGroup) */
export function passwordMatchValidator(
  control: AbstractControl
): ValidationErrors | null {
  const pw  = control.get('password')?.value  ?? '';
  const cpw = control.get('confirmPassword')?.value ?? '';
  return pw && cpw && pw !== cpw ? { passwordMismatch: true } : null;
}
 
/** At least one uppercase letter */
export function uppercaseValidator(
  control: AbstractControl
): ValidationErrors | null {
  return /[A-Z]/.test(control.value ?? '') ? null : { noUppercase: true };
}
 
/** At least one lowercase letter */
export function lowercaseValidator(
  control: AbstractControl
): ValidationErrors | null {
  return /[a-z]/.test(control.value ?? '') ? null : { noLowercase: true };
}
 
/** At least one digit */
export function digitValidator(
  control: AbstractControl
): ValidationErrors | null {
  return /[0-9]/.test(control.value ?? '') ? null : { noDigit: true };
}
 
/** At least one special character */
export function specialCharValidator(
  control: AbstractControl
): ValidationErrors | null {
  return /[^A-Za-z0-9]/.test(control.value ?? '')
    ? null
    : { noSpecialChar: true };
}
 
// ─── Password strength helpers ─────────────────────────────────────────────────
export interface StrengthRule {
  label: string;
  met: boolean;
}
 
export type StrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong';
 

@Component({
  selector: 'app-sign-up',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.scss',
})
export class SignUp implements OnInit, OnDestroy {
 
  // ── Form ────────────────────────────────────────────────────────────────────
  form!: FormGroup;
 
  // ── UI State ────────────────────────────────────────────────────────────────
  authState        = signal<AuthState>('idle');
  showPassword     = signal(false);
  showConfirmPw    = signal(false);
  errorMessage     = signal('');
 
  // ── Animation ───────────────────────────────────────────────────────────────
  private animFrame: number | null = null;
  floatOffset = signal(0);
  private startTime = 0;
 
  // ── Password strength (reactive, derived from form value) ───────────────────
  passwordStrength = signal<StrengthLevel>('empty');
 
  strengthRules = signal<StrengthRule[]>([
    { label: 'At least 8 characters',    met: false },
    { label: 'One uppercase letter',      met: false },
    { label: 'One lowercase letter',      met: false },
    { label: 'One number',               met: false },
    { label: 'One special character',     met: false },
  ]);
 
  constructor(
    private fb: FormBuilder,
    private router: Router,
  ) {}
 
  // ─── Lifecycle ───────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.form = this.fb.group(
      {
        firstName:        ['', [Validators.required, Validators.minLength(2)]],
        lastName:         ['', [Validators.required, Validators.minLength(2)]],
        username:         ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_.-]+$/)]],
        email:            ['', [Validators.required, Validators.email]],
        phone:            ['', [Validators.pattern(/^\+?[0-9\s\-().]{7,20}$/)]],
        password:         ['', [
          Validators.required,
          Validators.minLength(8),
          uppercaseValidator,
          lowercaseValidator,
          digitValidator,
          specialCharValidator,
        ]],
        confirmPassword:  ['', [Validators.required]],
        agreeTerms:       [false, [Validators.requiredTrue]],
        agreePrivacy:     [false, [Validators.requiredTrue]],
        newsletter:       [false],
      },
      { validators: passwordMatchValidator }
    );
 
    // Live password-strength feedback
    this.form.get('password')!.valueChanges.subscribe((val: string) => {
      this.updateStrength(val ?? '');
    });
 
    this.startTime = performance.now();
    this.animate();
  }
 
  ngOnDestroy(): void {
    if (this.animFrame !== null) cancelAnimationFrame(this.animFrame);
  }
 
  // ─── Animation loop ──────────────────────────────────────────────────────────
  private animate(): void {
    this.animFrame = requestAnimationFrame((t) => {
      this.floatOffset.set(Math.sin((t - this.startTime) / 1800) * 14);
      this.animate();
    });
  }
 
  // ─── Password strength ───────────────────────────────────────────────────────
  private updateStrength(val: string): void {
    const rules: StrengthRule[] = [
      { label: 'At least 8 characters',  met: val.length >= 8 },
      { label: 'One uppercase letter',    met: /[A-Z]/.test(val) },
      { label: 'One lowercase letter',    met: /[a-z]/.test(val) },
      { label: 'One number',             met: /[0-9]/.test(val) },
      { label: 'One special character',   met: /[^A-Za-z0-9]/.test(val) },
    ];
    this.strengthRules.set(rules);
 
    const metCount = rules.filter(r => r.met).length;
    if (!val)         this.passwordStrength.set('empty');
    else if (metCount <= 1) this.passwordStrength.set('weak');
    else if (metCount === 2) this.passwordStrength.set('fair');
    else if (metCount === 3) this.passwordStrength.set('good');
    else                    this.passwordStrength.set('strong');
  }
 
  get strengthLabel(): string {
    const map: Record<StrengthLevel, string> = {
      empty: '',
      weak:  'Weak',
      fair:  'Fair',
      good:  'Good',
      strong:'Strong',
    };
    return map[this.passwordStrength()];
  }
 
  // ─── Helpers ─────────────────────────────────────────────────────────────────
  togglePassword():   void { this.showPassword.update(v => !v); }
  toggleConfirmPw():  void { this.showConfirmPw.update(v => !v); }
 
  // Typed field-getter helper
  ctrl(name: string): AbstractControl { return this.form.get(name)!; }
 
  get firstName():        AbstractControl { return this.ctrl('firstName'); }
  get lastName():         AbstractControl { return this.ctrl('lastName'); }
  get username():         AbstractControl { return this.ctrl('username'); }
  get email():            AbstractControl { return this.ctrl('email'); }
  get phone():            AbstractControl { return this.ctrl('phone'); }
  get password():         AbstractControl { return this.ctrl('password'); }
  get confirmPassword():  AbstractControl { return this.ctrl('confirmPassword'); }
  get agreeTerms():       AbstractControl { return this.ctrl('agreeTerms'); }
  get agreePrivacy():     AbstractControl { return this.ctrl('agreePrivacy'); }
 
  /**
   * Returns a human-readable error for a given field, or '' if none.
   * For confirmPassword the mismatch error lives on the group level.
   */
  fieldError(field: string): string {
    if (field === 'confirmPassword') {
      const ctrl = this.confirmPassword;
      if (!ctrl.dirty) return '';
      if (ctrl.hasError('required')) return 'Please confirm your password.';
      if (this.form.hasError('passwordMismatch')) return 'Passwords do not match.';
      return '';
    }
 
    const ctrl = this.form.get(field)!;
    if (!ctrl.dirty || !ctrl.invalid) return '';
 
    switch (field) {
      case 'firstName':
        if (ctrl.hasError('required'))   return 'First name is required.';
        if (ctrl.hasError('minlength'))  return 'Must be at least 2 characters.';
        break;
      case 'lastName':
        if (ctrl.hasError('required'))   return 'Last name is required.';
        if (ctrl.hasError('minlength'))  return 'Must be at least 2 characters.';
        break;
      case 'username':
        if (ctrl.hasError('required'))   return 'Username is required.';
        if (ctrl.hasError('minlength'))  return 'Must be at least 3 characters.';
        if (ctrl.hasError('pattern'))    return 'Only letters, numbers, _ . - allowed.';
        break;
      case 'email':
        if (ctrl.hasError('required'))   return 'Email is required.';
        if (ctrl.hasError('email'))      return 'Enter a valid email address.';
        break;
      case 'phone':
        if (ctrl.hasError('pattern'))    return 'Enter a valid phone number.';
        break;
      case 'password':
        if (ctrl.hasError('required'))   return 'Password is required.';
        if (ctrl.hasError('minlength'))  return 'At least 8 characters required.';
        break;
    }
    return '';
  }
 
  isFieldValid(field: string): boolean {
    const ctrl = this.form.get(field)!;
    if (field === 'confirmPassword') {
      return (
        ctrl.valid && ctrl.dirty &&
        !this.form.hasError('passwordMismatch')
      );
    }
    return ctrl.valid && ctrl.dirty;
  }
 
  /** True when the field has an error message to show */
  hasFieldError(field: string): boolean {
    return !!this.fieldError(field);
  }
 
  // ─── Submit ───────────────────────────────────────────────────────────────────
  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
 
    if (this.form.invalid) return;
 
    this.authState.set('loading');
    this.errorMessage.set('');
 
    try {
      // await this.authService.signUp(this.form.value);
      await new Promise(resolve => setTimeout(resolve, 1600));
 
      this.authState.set('success');
      setTimeout(() => this.router.navigate(['/home']), 1000);
    } catch (err: any) {
      this.authState.set('error');
      this.errorMessage.set(
        err?.error?.message ?? 'Something went wrong. Please try again.'
      );
    }
  }
 
  // ─── Social Auth (stubs) ─────────────────────────────────────────────────────
  signUpWithGoogle():   void { /* TODO: OAuth */ }
  signUpWithGitHub():   void { /* TODO: OAuth */ }
  signUpWithFacebook(): void { /* TODO: OAuth */ }
 
  // ─── Derived state ───────────────────────────────────────────────────────────
  get isLoading(): boolean { return this.authState() === 'loading'; }
  get isSuccess(): boolean { return this.authState() === 'success'; }
  get hasError():  boolean { return this.authState() === 'error';   }
}