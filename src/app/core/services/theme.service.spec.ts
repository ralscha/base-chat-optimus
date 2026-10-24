import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeService } from './theme.service';

describe('Optimus theme integration', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    document.documentElement.classList.remove('app-dark');
    document.documentElement.removeAttribute('data-theme');
  });

  it('applies a saved dark theme before the first render', () => {
    localStorage.setItem('chat_theme', JSON.stringify('dark'));
    const theme = TestBed.inject(ThemeService);

    expect(theme.theme()).toBe('dark');
    expect(document.documentElement.classList.contains('app-dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggles the Optimus selector and persists the chosen theme', () => {
    const theme = TestBed.inject(ThemeService);
    theme.toggle();
    TestBed.tick();
    expect(document.documentElement.classList.contains('app-dark')).toBe(true);
    expect(JSON.parse(localStorage.getItem('chat_theme')!)).toBe('dark');

    theme.toggle();
    TestBed.tick();
    expect(document.documentElement.classList.contains('app-dark')).toBe(false);
    expect(JSON.parse(localStorage.getItem('chat_theme')!)).toBe('light');
  });
});
