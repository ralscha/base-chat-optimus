import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { MockDataService } from './core/services/mock-data.service';
import { ThemeService } from './core/services/theme.service';
import { provideOptimus } from '@openng/optimus-ui/config';
import Aura from '@openng/optimus-ui-themes/aura';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideOptimus({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.app-dark',
          cssLayer: { name: 'optimus', order: 'theme, base, optimus, components, utilities' },
        },
      },
      ripple: true,
    }),
    provideRouter(routes, withComponentInputBinding()),
    provideAppInitializer(() => {
      inject(MockDataService).seed();
      // Apply the saved theme before any component renders.
      inject(ThemeService);
    }),
  ],
};
