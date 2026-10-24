import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/services/auth.service';
import { SignInComponent } from './sign-in';

describe('SignInComponent with Optimus controls', () => {
  let fixture: ComponentFixture<SignInComponent>;
  let element: HTMLElement;
  let signIn: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    signIn = vi.fn().mockReturnValue({ success: true });
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { signIn } }],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(SignInComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  function fill(id: string, value: string): void {
    const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(): void {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
  }

  it('shows validation after submission and keeps invalid forms from signing in', () => {
    expect(element.querySelector('#username')?.classList.contains('p-invalid')).toBe(false);
    submit();
    expect(signIn).not.toHaveBeenCalled();
    expect(element.querySelector('#username')?.classList.contains('p-invalid')).toBe(true);
    expect(element.textContent).toContain('Username is required.');
    expect(element.textContent).toContain('Password is required.');
  });

  it('passes the native input values through signal forms to authentication', () => {
    fill('username', 'alice');
    fill('password', 'password123');
    submit();
    expect(signIn).toHaveBeenCalledExactlyOnceWith('alice', 'password123');
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/conversations']);
  });

  it('renders service failures in an Optimus message and preserves entered values', () => {
    signIn.mockReturnValue({ success: false, error: 'Invalid password.' });
    fill('username', 'alice');
    fill('password', 'incorrect');
    submit();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Invalid password.');
    expect(element.querySelector<HTMLInputElement>('#username')?.value).toBe('alice');
    expect(navigate).not.toHaveBeenCalled();
  });
});
