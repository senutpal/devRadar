# devradar vs code extension

discord status for vs code. see what your friends are coding in real-time.

## features

- real-time presence: see which friends are online and what they are working on
- activity sharing: share your coding activity with privacy controls
- poke friends: send friendly notifications
- privacy first: full control over what you share
- coding stats: track session time and coding intensity

## views

- my stats: your coding statistics
- friends: list of online friends
- leaderboard: friend rankings
- friend requests: incoming and outgoing requests
- activity: recent activity feed

## installation

```
pnpm install
pnpm build
```

open `apps/extension` in vs code and press f5 to launch the extension development host.

## getting started

1. click the devradar icon in the activity bar
2. login with github
3. start coding - your friends see your status

## configuration

settings via file > preferences > settings, search for "devradar":

| setting                        | default                              | description                   |
| ------------------------------ | ------------------------------------ | ----------------------------- |
| devradar.privacyMode           | false                                | hide your activity            |
| devradar.showFileName          | true                                 | show current file             |
| devradar.showProject           | true                                 | show project name             |
| devradar.showLanguage          | true                                 | show language                 |
| devradar.showStatusBarItem     | true                                 | show status bar item          |
| devradar.enableNotifications   | true                                 | enable notifications          |
| devradar.blacklistedFiles      | [".env", ".env.*", "*.pem", "*.key"] | files to never broadcast      |
| devradar.blacklistedWorkspaces | []                                   | workspaces to never broadcast |
| devradar.idleTimeout           | 300000                               | ms before going idle (5 mins) |
| devradar.heartbeatInterval     | 60000                                | heartbeat interval in ms      |

## commands

access via command palette (ctrl+shift+p / cmd+shift+p):

- devradar: login with github
- devradar: logout
- devradar: toggle privacy mode
- devradar: poke friend
- devradar: refresh friends
- devradar: view profile
- devradar: set status
- devradar: add friend
- devradar: accept/reject friend request

## privacy

- code is never transmitted, only metadata
- sensitive files like .env are hidden by default
- privacy mode available for complete invisibility
- blacklist specific files and workspaces

## development

```
pnpm install
pnpm build
pnpm watch     # watch mode for development
pnpm package   # create vsix package
```

## license

agpl-3.0-or-later
