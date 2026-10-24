import { Component, inject } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';
import { ButtonModule } from '@openng/optimus-ui/button';

@Component({
  selector: 'app-theme-toggle',
  imports: [ButtonModule],
  templateUrl: './theme-toggle.html',
})
export class ThemeToggleComponent {
  protected readonly themeService = inject(ThemeService);
}
