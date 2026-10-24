import { Component, output } from '@angular/core';
import { ButtonDirective } from '@openng/optimus-ui/button';

export const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢'];

const COMMON_EMOJIS = [
  '😀',
  '😂',
  '😍',
  '🥰',
  '😎',
  '🤔',
  '😢',
  '😮',
  '😡',
  '🥳',
  '👍',
  '👎',
  '❤️',
  '🔥',
  '🎉',
  '🙏',
  '💯',
  '✅',
  '⭐',
  '💪',
  '👋',
  '🤣',
  '😅',
  '🙌',
  '😭',
  '🤯',
  '😱',
  '🤗',
  '🫶',
  '👀',
];

@Component({
  selector: 'app-emoji-picker',
  imports: [ButtonDirective],
  template: `
    <div class="grid grid-cols-6 gap-0.5 w-60 max-w-full" role="group" aria-label="Choose an emoji">
      @for (emoji of emojis; track emoji) {
        <button
          pButton
          [text]="true"
          severity="secondary"
          type="button"
          class="text-xl! p-1.5! aspect-square"
          [attr.aria-label]="'Insert ' + emoji"
          (click)="pick.emit(emoji)"
        >
          {{ emoji }}
        </button>
      }
    </div>
  `,
})
export class EmojiPickerComponent {
  pick = output<string>();
  protected readonly emojis = COMMON_EMOJIS;
}
