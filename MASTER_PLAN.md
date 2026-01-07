# DevRadar: The Master Plan 🚀

## 1. The Vision

**DevRadar** is the "Discord Status" for VS Code. Reliable, passive social presence for developers.
**Core Value**: Coding is lonely. DevRadar makes it a multiplayer experience without the friction of screen sharing.
**Strategic Pivot**: From "Stalking Friends" → "Community & Team Velocity".

---

## 2. Product Blueprint

### Phase 1: The MVP (The Hook)

_Utility & Presence_

- **Friends List Sidebar**: Dedicated TreeView in VS Code.
- **Rich Presence**:
  - 🟢 **Status**: "Writing TypeScript in auth.ts"
  - 📂 **Project**: "Building my-startup-backend" (Masked if private)
  - ⏱️ **Time**: "Coding for 2h 15m today"
- **Interaction**: One-click "Poke" / "Nudge".
- **Privacy**: Incognito Mode toggle.

### Phase 2: Gamification (The Retention)

_Dopamine & Competition_

- **Live Heatmaps**: Visual intensity of your network's coding (Extension glows when friends are active).
- **Leaderboards**: "Weekly Lines of Code" / "Weekly Commits".
- **Boss Battles**: Victory animations when closing GitHub issues.
- **Micro-Integrations**:
  - "Listening to Lo-Fi Hip Hop" (Spotify)
  - "Ctrl+C / Ctrl+V" Status (Stack Overflow detection)

### Phase 3: B2B / Teams (The Business)

_Coordination & Velocity_

- **Merge Conflict Radar**: "Warning: @Alice is also editing `auth.ts`. Contact her to avoid conflicts."
- **Team Views**: Private instances for companies.
- **Manager Reports**: High-level velocity metrics (optional).

---

## 3. Technical Architecture (The Secret Sauce)

### **Client-Side (VS Code Extension)**

- **Event-Driven**: Hooks into `vscode.window.onDidChangeActiveTextEditor`.
- **Smart Debouncing**: Sends "Heartbeats" every 30s or on significant context change (File Switch).
- **Privacy First**: Local hashing of filenames for "Conflict Radar" - never send raw code.

### **Server-Side (Real-Time Presence Network)**

- **Runtime**: **Node.js + Fastify** (Chosen for shared Types/DTOs with Client).
- **Transport**: **WebSockets** (Persistent connections).
- **Hot Layer (State)**: **Redis Pub/Sub**
  - Stores ephemeral status with TTL.
  - Efficiently fans out updates to subscribers (O(1)).
- **Cold Layer (Data)**: **PostgreSQL**
  - User profiles, relationships, historical stats.

### **Diagram**

`VS Code Client` <--> `Load Balancer` <--> `Fastify Cluster` <--> `Redis` (Pub/Sub) <--> `PostgreSQL`

---

## 4. Business Model (SaaS)

| Tier     | Price    | Features                                                             |
| :------- | :------- | :------------------------------------------------------------------- |
| **FREE** | Free     | Real-time status, Friends list, Global Leaderboards.                 |
| **Pro**  | $5/mo    | Dark Mode themes, Custom Emojis, 30-day History, Ghost Mode.         |
| **Team** | $12/user | **Merge Conflict Radar**, Private Team Instances, Slack Integration. |

**Monetization Strategy**: "Trojan Horse". Get individual devs addicted -> They convince their boss to buy "Team" plan for the Conflict Radar.

---

## 5. Go-To-Market (GTM)

- **Marketplace SEO**: Keywords "Discord Presence", "Team", "Productivity".
- **Visuals**: Animated GIF in README is mandatory.
- **Viral Loops**: "Share your Streak" (Twitter/LinkedIn image generation).
- **Influencer Pitch**: "See if you code harder than your friends."

---

## 6. Critical Risks & Mitigations

- **The "Boss Monitor" Fear**:
  - _Mitigation_: "Anti-Boss" branding. "We don't track keystrokes. You control visibility."
- **Privacy/GDPR**:
  - _Mitigation_: Self-hosted analytics (PostHog). "Nuke My Data" button.
- **Source Code Leaks**:
  - _Mitigation_: NEVER send code content. Only metadata/hashes.
