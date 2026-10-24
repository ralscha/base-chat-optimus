import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { Select, SelectModule } from '@openng/optimus-ui/select';
import { SavedMessage } from '../../core/models/bookmark.model';
import { AuthService } from '../../core/services/auth.service';
import { BookmarksService } from '../../core/services/bookmarks.service';
import { ConversationPartnerService } from '../../core/services/conversation-partner.service';

@Component({
  selector: 'app-bookmarks',
  host: { class: 'flex flex-col flex-1 min-h-0' },
  imports: [
    DatePipe,
    RouterLink,
    FormsModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    SelectModule,
  ],
  templateUrl: './bookmarks.html',
})
export class BookmarksComponent {
  protected readonly bookmarks = inject(BookmarksService);
  readonly #partners = inject(ConversationPartnerService);
  readonly #auth = inject(AuthService);

  protected readonly search = signal('');
  protected readonly collection = signal('');
  protected readonly newCollection = signal('');
  protected readonly error = signal('');
  protected readonly status = signal('');
  protected readonly collectionOptions = computed(() => [
    { label: 'All collections', value: '' },
    ...this.bookmarks.collections().map((name) => ({ label: name, value: name })),
  ]);

  protected readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.bookmarks.bookmarks().filter((bookmark) => {
      if (this.collection() && bookmark.collection !== this.collection()) {
        return false;
      }
      if (!query) {
        return true;
      }
      const message = bookmark.message;
      const searchable = message
        ? [
            message.text,
            message.checklist?.title ?? '',
            ...(message.checklist?.items.map((item) => item.text) ?? []),
            this.partnerName(bookmark),
            bookmark.collection,
            message.imageDataUrl ? 'Image attachment' : '',
          ].join(' ')
        : 'Original message unavailable ' + bookmark.collection;
      return searchable.toLowerCase().includes(query);
    });
  });

  protected partnerName(bookmark: SavedMessage): string {
    return bookmark.message
      ? (this.#partners.fromConversationId(bookmark.conversationId)?.displayName ?? 'Conversation')
      : '';
  }

  protected senderName(bookmark: SavedMessage): string {
    const message = bookmark.message;
    if (!message) {
      return '';
    }
    return message.senderId === this.#auth.currentUser()?.id ? 'You' : this.partnerName(bookmark);
  }

  protected completedCount(bookmark: SavedMessage): number {
    return bookmark.message?.checklist?.items.filter((item) => item.completed).length ?? 0;
  }

  protected updateSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected updateNewCollection(event: Event): void {
    this.newCollection.set((event.target as HTMLInputElement).value);
  }

  protected createCollection(event: Event): void {
    event.preventDefault();
    const result = this.bookmarks.createCollection(this.newCollection());
    this.error.set(result.success ? '' : (result.error ?? 'Could not create collection.'));
    this.status.set(
      result.success ? 'Collection created. Choose it on any saved message below.' : '',
    );
    if (result.success) {
      this.newCollection.set('');
    }
  }

  protected move(bookmark: SavedMessage, collection: string, select: Select): void {
    const result = this.bookmarks.move(bookmark.messageId, collection);
    this.error.set(result.success ? '' : (result.error ?? 'Could not move saved message.'));
    this.status.set(result.success ? 'Saved message moved.' : '');
    if (!result.success) {
      select.writeValue(bookmark.collection);
    }
  }

  protected remove(bookmark: SavedMessage): void {
    const result = this.bookmarks.remove(bookmark.messageId);
    this.error.set(result.success ? '' : (result.error ?? 'Could not remove saved message.'));
    this.status.set(result.success ? 'Bookmark removed.' : '');
  }
}
