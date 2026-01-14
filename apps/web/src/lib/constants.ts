export const SITE_CONFIG = {
  name: 'DevRadar',
  tagline: 'The Discord Status for VS Code',
  description:
    'See what your friends are coding in real-time. Turn coding from a solo activity into a multiplayer experience.',
  url: 'https://devradar.dev',
  ogImage: '/og-image.png',

  links: {
    github: 'https://github.com/senutpal/devradar',
    twitter: 'https://twitter.com/devradar',
    discord: 'https://discord.gg/devradar',
    marketplace: 'https://marketplace.visualstudio.com/items?itemName=devradar.devradar',
  },

  email: {
    support: 'support@devradar.dev',
    hello: 'hello@devradar.dev',
  },
} as const;

export const NAV_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
] as const;

export const FOOTER_LINKS = {
  product: [
    { href: '/#features', label: 'Features' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/docs', label: 'Documentation' },
    { href: SITE_CONFIG.links.marketplace, label: 'VS Code Extension', external: true },
  ],
  company: [
    { href: '/about', label: 'About' },
    { href: '/blog', label: 'Blog' },
    { href: '/careers', label: 'Careers' },
  ],
  legal: [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
  ],
  social: [
    { href: SITE_CONFIG.links.github, label: 'GitHub', icon: 'github' },
    { href: SITE_CONFIG.links.twitter, label: 'Twitter', icon: 'twitter' },
    { href: SITE_CONFIG.links.discord, label: 'Discord', icon: 'discord' },
  ],
} as const;

export const FEATURES = [
  {
    id: 'presence',
    title: 'Real-Time Presence',
    description:
      'See exactly what your friends are coding. File names, languages, and projects - all live as they work.',
    icon: 'Radio',
  },
  {
    id: 'friends',
    title: 'Developer Friends List',
    description:
      "Build your coding circle. Follow developers you admire and see when they're active.",
    icon: 'Users',
  },
  {
    id: 'privacy',
    title: 'Privacy First',
    description:
      'Your code stays yours. We never transmit code content - only metadata you choose to share.',
    icon: 'Shield',
  },
  {
    id: 'streaks',
    title: 'Coding Streaks',
    description:
      'Maintain your daily coding streak. Get motivated with gamified consistency tracking.',
    icon: 'Flame',
  },
  {
    id: 'leaderboards',
    title: 'Leaderboards',
    description: "Compete with friends on weekly coding time. See who's shipping the most.",
    icon: 'Trophy',
  },
  {
    id: 'conflicts',
    title: 'Merge Conflict Radar',
    description:
      'Get alerted when teammates are editing the same file. Prevent conflicts before they happen.',
    icon: 'GitBranch',
  },
] as const;

export const PRICING_TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    annualPrice: 0,
    description: 'Perfect for solo developers',
    features: [
      { text: 'Real-time presence', included: true },
      { text: 'Up to 10 friends', included: true },
      { text: 'Basic activity stats', included: true },
      { text: 'Global leaderboards', included: true },
      { text: 'Ghost mode', included: false },
      { text: 'Custom status messages', included: false },
      { text: 'Team features', included: false },
      { text: 'Priority support', included: false },
    ],
    cta: 'Get Started Free',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    annualPrice: 588, // ₹49/month billed annually (₹588/year)
    description: 'For serious developers',
    razorpayPlanIds: {
      monthly: process.env.NEXT_PUBLIC_RAZORPAY_PRO_MONTHLY_PLAN_ID || 'plan_pro_monthly',
      annual: process.env.NEXT_PUBLIC_RAZORPAY_PRO_ANNUAL_PLAN_ID || 'plan_pro_annual',
    },
    features: [
      { text: 'Everything in Free', included: true },
      { text: 'Unlimited friends', included: true },
      { text: 'Ghost mode (go invisible)', included: true },
      { text: 'Custom status messages', included: true },
      { text: '30-day history', included: true },
      { text: 'Custom themes', included: true },
      { text: 'Team features', included: false },
      { text: 'Priority support', included: true },
    ],
    cta: 'Upgrade to Pro',
    highlighted: true,
  },
  {
    id: 'team',
    name: 'Team',
    price: 249,
    annualPrice: 2988, // ₹249/month billed annually (₹2988/year)
    priceNote: 'per user',
    description: 'For distributed teams',
    razorpayPlanIds: {
      monthly: process.env.NEXT_PUBLIC_RAZORPAY_TEAM_MONTHLY_PLAN_ID || 'plan_team_monthly',
      annual: process.env.NEXT_PUBLIC_RAZORPAY_TEAM_ANNUAL_PLAN_ID || 'plan_team_annual',
    },
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'Merge conflict radar', included: true },
      { text: 'Team analytics dashboard', included: true },
      { text: 'Slack integration', included: true },
      { text: 'Private leaderboards', included: true },
      { text: 'SSO & SAML', included: true },
      { text: 'Admin controls', included: true },
      { text: 'Dedicated support', included: true },
    ],
    cta: 'Upgrade to Team',
    highlighted: false,
  },
] as const;

export const FAQ_ITEMS = [
  {
    question: 'Is my code transmitted to DevRadar servers?',
    answer:
      "Never. We only transmit metadata like file names, programming languages, and timestamps. Your actual code content never leaves your machine. We're developers too - we understand privacy.",
  },
  {
    question: 'Who can see my coding activity?',
    answer:
      'Only people you explicitly follow back (mutual follows). You have complete control over your visibility. You can also enable Ghost Mode to go completely invisible while still seeing others.',
  },
  {
    question: 'What data do you collect?',
    answer:
      'We collect: file names (can be masked), programming languages, project names (optional), session duration, and activity intensity. We never collect code content, file paths, or sensitive information.',
  },
  {
    question: 'How does Ghost Mode work?',
    answer:
      "Ghost Mode makes you completely invisible to all friends while still allowing you to see their activity. It's perfect for when you need to focus or work on sensitive projects. Available on Pro and Team plans.",
  },
  {
    question: 'Can I exclude certain files or projects?',
    answer:
      'Absolutely! You can configure a blacklist of file patterns (like .env, *.pem, *.key) that will never be shared. You can also exclude entire projects from being tracked.',
  },
  {
    question: 'Does it work with VS Code forks like Cursor?',
    answer:
      'Yes! DevRadar works with VS Code and any fork that supports VS Code extensions, including Cursor, VSCodium, and others.',
  },
  {
    question: 'What happens to my data if I uninstall?',
    answer:
      "You can request complete data deletion at any time from your dashboard. We'll remove all your data within 24 hours. We also have an automated 90-day inactivity cleanup.",
  },
  {
    question: 'Is there a rate limit on status updates?',
    answer:
      'We use smart debouncing - updates are sent every 30 seconds during active coding, and immediately on file switches. This keeps the experience real-time while being resource-efficient.',
  },
] as const;

export const TESTIMONIALS = [
  {
    quote:
      "Finally, the social coding experience I've always wanted. It's like Discord but for my IDE.",
    author: 'Sarah Chen',
    role: 'Senior Engineer at Stripe',
    avatar: '/avatars/sarah.jpg',
  },
  {
    quote:
      'The merge conflict radar alone has saved us hours of rework. Essential for any distributed team.',
    author: 'Marcus Johnson',
    role: 'Tech Lead at Vercel',
    avatar: '/avatars/marcus.jpg',
  },
  {
    quote: "I love seeing my friends' coding streaks. It motivates me to ship more consistently.",
    author: 'Priya Sharma',
    role: 'Indie Hacker',
    avatar: '/avatars/priya.jpg',
  },
] as const;

export const STATS = [
  { value: '10,000+', label: 'Active Developers' },
  { value: '50M+', label: 'Lines Tracked' },
  { value: '99.9%', label: 'Uptime' },
  { value: '<50ms', label: 'Latency' },
] as const;

export const HOW_IT_WORKS_STEPS = [
  {
    number: '01',
    title: 'Install',
    description: 'Add DevRadar to VS Code with a single click. Takes 30 seconds.',
    icon: 'Download',
    accent: '#FFB800',
  },
  {
    number: '02',
    title: 'Connect',
    description: 'Sign in with GitHub. Follow friends, colleagues, or devs you admire.',
    icon: 'UserPlus',
    accent: '#00D4FF',
  },
  {
    number: '03',
    title: 'Go Live',
    description: "Start coding. Your network lights up in real-time. That's it.",
    icon: 'Radio',
    accent: '#FF6B6B',
  },
] as const;

export const LEGAL_CONFIG = {
  lastUpdated: 'January 13, 2026',
} as const;
