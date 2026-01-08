# Changelog

All notable changes to the DevRadar extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
