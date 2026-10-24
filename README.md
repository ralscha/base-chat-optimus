# BaseChat Optimus

BaseChat Optimus implements the BaseChat application with [Optimus UI](https://optimus.openng.org/). It preserves the source application's authentication, contacts, messaging, replies, shared checklists, personal bookmarks, and account management.

The UI uses Optimus 2 components and the Aura theme, including buttons, inputs, cards, dialogs, messages, avatars, selects, progress bars, and popovers. Tailwind CSS provides layout utilities; daisyUI is not installed. Optimus v2 matches Angular 22, as described in the [installation guide](https://optimus.openng.org/installation).

The repository currently runs in demo mode: users, sessions, contacts, conversations, messages, checklists, and personal bookmarks are stored in browser `localStorage`. Passkey ceremonies, presence, delivery, and password recovery are simulated. No credentials or message data leave the browser.

## Tech Stack

| Layer           | Technology                                                   |
| --------------- | ------------------------------------------------------------ |
| Framework       | [Angular](https://angular.dev) 22                            |
| Components      | [Optimus UI](https://optimus.openng.org/) 2 with Aura themes |
| Layout          | [Tailwind CSS](https://tailwindcss.com) 4                    |
| Language        | TypeScript 6.0                                               |
| Package Manager | [pnpm](https://pnpm.io)                                      |
| Linting         | ESLint + angular-eslint                                      |
| Formatting      | Prettier                                                     |

## Features

- **Authentication**: sign in, sign up, forgot/reset password, simulated passkey flows
- **Contacts**: contact list, add, remove, block, unblock
- **Direct Messaging**: conversation list, message history, send/delete messages, unread badges
- **Quoted replies**: reply to a message, preview its context, and jump to the original
- **Shared checklists**: create lists inside conversations, then add, remove, and check off items
- **Personal bookmarks**: save messages, organize them into named collections, search, and open the original
- **Profile**: view and update profile, change password, passkey management, account deletion
- **Real-time contract**: documented event and channel conventions for a future Centrifugo client
- **Theming**: persistent light/dark mode toggle using the Optimus Aura theme

## Getting Started

Use Node.js 22.22.3+, 24.15.0+, or 26+ and the pnpm version pinned in `package.json`.
Commit `pnpm-lock.yaml` when updating dependencies; automated installs should use
`pnpm install --frozen-lockfile`.

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm start

# Build for production
pnpm build

# Lint
pnpm lint

# Run unit tests
pnpm test

# Run the browser smoke test after a production build
pnpm build
pnpm test:browser

# Format
pnpm format
```

The dev server runs at `http://localhost:4201`, allowing the original BaseChat to run on port 4200 alongside it. Browser storage is scoped to each origin, so these two development instances keep independent demo data.

The production output is in `dist/base-chat-optimus/browser`. Serve this directory with an SPA fallback to `index.html` for deep links.

The browser smoke test uses a fresh, isolated Chromium profile and local ports 4304/9332. It detects common Edge/Chrome/Chromium installations; set `BROWSER_PATH` for another executable location. It checks the rendered Optimus controls, theme persistence, contacts, profile, replies, shared checklists, bookmark collections and deep links, and mobile overflow. Screenshots and isolated test profiles are saved under ignored `tmp/`.

`pnpm-workspace.yaml` records the native build scripts required by the Angular tooling and
pins Vite to a patched release until Angular updates its bundled version. TypeScript stays
on 6.0 because that is the compiler version supported by Angular 22.

Optimus is configured in `src/app/app.config.ts`. The theme selector `.app-dark` is maintained by `ThemeService`, and `src/styles.css` maps the application's semantic layout colors to Optimus tokens. Component styling is placed between Tailwind's base and utility layers so layout overrides work consistently.

Use `me` / `password123` to explore the seeded demo. Other seeded usernames are listed in `MockDataService`; their short passwords exist only for demo sign-in compatibility.

### Try replies, checklists, and bookmarks

- Open a conversation and use a message's **Message actions** menu to reply or save it.
  Replies keep a reference to the original message; an unavailable original is shown without its content.
- Use **Create checklist** in the composer to share a titled list. Either participant can check
  off, add, or remove items. Sign out and sign in as the other seeded participant in the same browser
  to try editing from both sides (for example, `alice` / `pass1`).
- Open **Saved** to search bookmarks, create collections, and move messages between them.
  Bookmarks belong to the signed-in account and are not shared with conversation partners.

These features persist across reloads in the same browser. Cross-device collaboration still requires
a backend; the demo does not synchronize independent browser sessions.

## Backend Contract

The [backend API contract](docs/backend-api.md) defines the expected HTTP endpoints and Centrifugo channel conventions. The frontend is designed to connect to any backend that implements this contract.

## Project Structure

```
src/app/
|-- core/           # Guards, models, services
|-- features/       # Feature areas: auth, chat, bookmarks, contacts, profile
|-- layouts/        # Auth layout and main layout
`-- shared/         # Reusable components, pipes
```
