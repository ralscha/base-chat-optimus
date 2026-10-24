import { ButtonDirective } from '@openng/optimus-ui/button';
import { Card } from '@openng/optimus-ui/card';
import { InputText } from '@openng/optimus-ui/inputtext';
import { Message } from '@openng/optimus-ui/message';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [ButtonDirective, Card, InputText, Message, FormField, FormRoot, RouterLink],
  templateUrl: './forgot-password.html',
})
export class ForgotPasswordComponent {
  readonly #auth = inject(AuthService);

  protected forgotPasswordModel = signal({
    username: '',
  });

  protected forgotPasswordForm = form(this.forgotPasswordModel, (path) => {
    required(path.username, { message: 'Username is required.' });
  });

  protected attempted = signal(false);
  protected submitted = signal(false);
  protected error = signal('');

  protected submit(event: Event): void {
    event.preventDefault();
    this.attempted.set(true);
    if (this.forgotPasswordForm().invalid()) {
      return;
    }
    this.error.set('');
    const { username } = this.forgotPasswordModel();
    const user = this.#auth.findUserByUsername(username);
    if (!user) {
      this.error.set('No account found with that username.');
    } else {
      this.submitted.set(true);
    }
  }
}
