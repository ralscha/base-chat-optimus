import { Component, computed, input } from '@angular/core';
import { AvatarModule } from '@openng/optimus-ui/avatar';

@Component({
  selector: 'app-avatar',
  imports: [AvatarModule],
  templateUrl: './avatar.html',
})
export class AvatarComponent {
  initials = input<string>('?');
  color = input<string>('bg-primary');
  size = input<'sm' | 'md' | 'lg'>('md');
  online = input<boolean>(false);
  showPresence = input<boolean>(false);

  protected foreground = computed(() => {
    const colors: Record<string, string> = {
      'bg-primary': 'text-primary-content',
      'bg-secondary': 'text-secondary-content',
      'bg-accent': 'text-accent-content',
      'bg-info': 'text-info-content',
      'bg-success': 'text-success-content',
      'bg-warning': 'text-warning-content',
      'bg-error': 'text-error-content',
    };
    return colors[this.color()] ?? 'text-primary-content';
  });

  protected sizeClasses = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 'w-8 h-8 text-xs';
      case 'lg':
        return 'w-14 h-14 text-lg';
      default:
        return 'w-10 h-10 text-sm';
    }
  });

  protected presenceDotSize = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 'w-2 h-2';
      case 'lg':
        return 'w-3.5 h-3.5';
      default:
        return 'w-3 h-3';
    }
  });
}
