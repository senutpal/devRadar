# DevRadar VS Code Extension

> **Discord Status for VS Code** - See what your friends are coding in real-time 🚀

## Features

- **🟢 Real-Time Presence**: See which friends are online and what they're working on
- **👀 Activity Sharing**: Share your coding activity (with privacy controls)
- **👋 Poke Friends**: Get their attention with a friendly notification
- **🔒 Privacy First**: Full control over what you share - or go invisible
- **📊 Coding Stats**: Track your session time and coding intensity

## Installation

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=devradar.devradar) or search for "DevRadar" in the Extensions panel.

## Getting Started

1. Click the DevRadar icon in the Activity Bar
2. Click "Login with GitHub" in the sidebar
3. Authorize DevRadar to access your GitHub profile
4. Start coding - your friends will see your status!

## Configuration

Access settings via `File > Preferences > Settings` and search for "DevRadar".

| Setting                        | Default                  | Description                     |
| ------------------------------ | ------------------------ | ------------------------------- |
| `devradar.privacyMode`         | `false`                  | Hide your activity from friends |
| `devradar.showFileName`        | `true`                   | Show current file name          |
| `devradar.showProject`         | `true`                   | Show project name               |
| `devradar.showLanguage`        | `true`                   | Show programming language       |
| `devradar.blacklistedFiles`    | `[".env", "*.pem", ...]` | Files to never broadcast        |
| `devradar.idleTimeout`         | `300000`                 | Time (ms) before going idle     |
| `devradar.enableNotifications` | `true`                   | Show poke notifications         |

## Commands

Access via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- **DevRadar: Login with GitHub** - Authenticate with your GitHub account
- **DevRadar: Logout** - Sign out of DevRadar
- **DevRadar: Toggle Privacy Mode** - Hide/show your activity
- **DevRadar: Poke Friend** - Send a notification to a friend
- **DevRadar: Set Status** - Manually set your status (online/idle/dnd/offline)
- **DevRadar: Refresh Friends** - Refresh your friends list

## Privacy

DevRadar is built with privacy as a core principle:

- **We NEVER transmit your code** - only metadata (filename, language, project name)
- **Blacklist sensitive files** - .env files are hidden by default
- **Privacy Mode** - Go completely invisible when needed
- **You're in control** - customize exactly what you share

## Development

This extension is part of the DevRadar monorepo.

```bash
# Install dependencies
pnpm install

# Build extension
pnpm --filter @devradar/extension build

# Watch mode
pnpm --filter @devradar/extension dev

# Package VSIX
pnpm --filter @devradar/extension package
```

## License

MIT - see [LICENSE](../../LICENSE)
