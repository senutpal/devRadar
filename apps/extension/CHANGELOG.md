# Changelog

All notable changes to the DevRadar extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-01-09

### Added

- **Daily Streaks**: Track your coding streak with visual indicators
  - 25-hour grace period for timezone flexibility
  - Streak milestones (7, 30, 100 days) unlock achievements
  - "At risk" warning when you haven't coded today
- **Leaderboards**: Compete with friends on weekly coding time
  - Mini-leaderboard view in sidebar with top 10 friends
  - Medal icons (🥇🥈🥉) for top 3 positions
  - Your rank indicator always visible
- **My Stats View**: New sidebar section showing:
  - Current streak with fire emoji
  - Today's coding session time
  - Weekly stats with rank position
  - Latest achievement
- **Achievements System**: Earn achievements for:
  - Closing GitHub issues ("Bug Slayer" 🐛)
  - Merging pull requests ("Merge Master" 🎉)
  - Streak milestones ("Week Warrior" 🔥, "Monthly Machine" ⚡, "Century Coder" 🏆)
- **GitHub Webhook Integration**: Connect your repos for automatic achievement tracking
  - Secure HMAC-SHA256 signature verification
  - Real-time achievement notifications to you and your followers
- **Network Activity Heatmap**: See when your network is "🔥 active"

### Changed

- Sidebar reorganized with Stats at top, then Friends, Leaderboard, Requests, Activity
- Achievement notifications now show who earned the achievement
- Stats and leaderboard refresh every 60 seconds

### Technical

- New server routes: `/api/v1/stats`, `/api/v1/leaderboards`, `/webhooks/github`
- Redis Sorted Sets for O(log N) leaderboard operations
- Prisma schema extended with `Achievement` and `WeeklyStats` models
- Secure webhook handling with constant-time signature comparison

---

## [0.2.0] - 2026-01-08

### Added

- **Friend Request System**: Send, accept, reject, and cancel friend requests
- **User Search**: Find users by username or display name
- **Friend Requests View**: New sidebar section showing incoming/outgoing requests
- **Real-time Notifications**: VS Code notifications when you receive or accept requests
- **Unfriend Action**: Remove friends with bidirectional cleanup
- Context menu actions for accept/reject/cancel on request items

### Changed

- Friends are now mutual (both users must accept to become friends)
- Updated sidebar with "Add Friend" button

---

## [0.1.0] - 2026-01-05

### Added

- Initial release
- GitHub OAuth authentication
- Real-time presence tracking
- Friends list with status indicators
- Activity feed showing friend events
- Status bar integration
- WebSocket connection with automatic reconnection
- Privacy mode and blacklisted files
- Poke functionality to get friends' attention
- Configurable settings for all features
