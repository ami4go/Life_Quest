// ═══════════════════════════════════════════════════════
// LIFEQUEST AI — App Constants
// ═══════════════════════════════════════════════════════

// ── Archetype Definitions ──
export const ARCHETYPES = {
  procrastinator: {
    id: 'procrastinator',
    emoji: '⏳',
    name: 'The Procrastinator',
    description: 'Avoids starting. Overwhelmed by task size.',
    color: '#f59e0b',
    fix: 'Micro-quests of 15 minutes. First action is always trivially easy.',
  },
  perfectionist: {
    id: 'perfectionist',
    emoji: '🎯',
    name: 'The Perfectionist',
    description: 'Avoids submitting. Fear of producing bad work.',
    color: '#7c3aed',
    fix: 'Iteration quests — rough draft is the deliverable. Done beats perfect.',
  },
  poor_estimator: {
    id: 'poor_estimator',
    emoji: '📏',
    name: 'The Time Optimist',
    description: 'Chronically underestimates time needed.',
    color: '#ef4444',
    fix: 'AI adds mandatory buffer time. Timeline warnings fire 48h early.',
  },
  overloaded: {
    id: 'overloaded',
    emoji: '🔥',
    name: 'The Overloaded',
    description: 'Too many tasks, no prioritization.',
    color: '#06b6d4',
    fix: 'AI daily priority triage: max 3 critical quests per day.',
  },
  low_motivation: {
    id: 'low_motivation',
    emoji: '💤',
    name: 'The Low Motivation',
    description: 'Disconnected from why the goal matters.',
    color: '#22c55e',
    fix: 'Stronger progress visualization. Milestone celebrations.',
  },
};

// ── Rank System ──
export const RANKS = [
  { level: 0, title: 'Initiate', emoji: '🌱', color: '#94a3b8' },
  { level: 10, title: 'Focused', emoji: '🎯', color: '#06b6d4' },
  { level: 20, title: 'Disciplined', emoji: '⚔️', color: '#7c3aed' },
  { level: 30, title: 'Master', emoji: '👑', color: '#f59e0b' },
  { level: 50, title: 'Legend', emoji: '🏆', color: '#fbbf24' },
];

// ── XP Constants ──
export const XP_PER_LEVEL = 1000;
export const XP_BASE_PER_DIFFICULTY = 100;
export const XP_ON_TIME_BONUS = 0.25;           // +25%
export const XP_STREAK_MULTIPLIER = 0.10;        // +10% per streak day
export const XP_BOSS_MULTIPLIER = 3;             // 3x for boss battles
export const XP_RECOVERY_BONUS = 150;            // Bonus for returning after miss
export const XP_MISSED_PENALTY_PER_STAR = 50;    // -50 × difficulty

// ── Focus Lock Constants ──
export const FOCUS_LOCK_BONUS = 0.50;             // +50% XP bonus
export const FOCUS_LOCK_EARLY_BONUS = 0.75;        // +75% if completed early
export const FOCUS_LOCK_PENALTY = 0.25;            // Lose 25% of base XP

// ── Proof of Completion Constants ──
export const PROOF_COMPLETION_BONUS = 0.50;        // +50% bonus for verified proof
export const PROOF_QUALITY_XP_PER_POINT = 20;      // 20 XP per quality point (1-5)

// ── Coins Economy ──
export const COINS_PER_SCORE = {
  1: 0,    // Score 1/5 — no coins (but encouraging feedback)
  2: 5,    // Score 2/5 — small reward for effort
  3: 15,   // Score 3/5 — solid work, meaningful coins
  4: 30,   // Score 4/5 — impressive, good payout
  5: 50,   // Score 5/5 — masterpiece, premium coins + badge
};

export const COIN_DIFFICULTY_MULTIPLIER = {
  1: 0.5,
  2: 0.75,
  3: 1.0,
  4: 1.5,
  5: 2.0,
};

export const DUEL_WIN_COIN_BONUS = 25;
export const DUEL_PARTICIPATION_COINS = 5;
export const CERTIFICATE_BONUS_COINS = 100;

// ── Challenge Categories ──
export const CHALLENGE_CATEGORIES = [
  { id: 'design', name: 'Design', emoji: '🎨', color: '#f472b6' },
  { id: 'writing', name: 'Writing', emoji: '✍️', color: '#a78bfa' },
  { id: 'coding', name: 'Coding', emoji: '💻', color: '#34d399' },
  { id: 'fitness', name: 'Fitness', emoji: '💪', color: '#fb923c' },
  { id: 'reasoning', name: 'Reasoning', emoji: '🧠', color: '#60a5fa' },
  { id: 'learning', name: 'Learning', emoji: '📚', color: '#fbbf24' },
  { id: 'hackathon', name: 'Hackathon', emoji: '⚡', color: '#f87171' },
  { id: 'custom', name: 'Custom', emoji: '🎯', color: '#94a3b8' },
];

// ── Duel Types ──
export const DUEL_TYPES = {
  CUSTOM: 'custom',
  AI_SUGGESTED: 'ai_suggested',
  SPEED_RACE: 'speed_race',
};

// ── AI Evaluation Score Labels ──
export const SCORE_LABELS = {
  1: { label: 'Needs Work', message: "Good start! Here's what to focus on next..." },
  2: { label: 'Getting There', message: "You're building momentum! A few tweaks will level this up..." },
  3: { label: 'Solid Work', message: "Strong effort! You've got the fundamentals down." },
  4: { label: 'Impressive', message: "This is quality work. You're clearly putting in the effort!" },
  5: { label: 'Masterpiece', message: "Exceptional! This is truly outstanding work." },
};

// ── Difficulty Scoring Weights ──
export const DIFFICULTY_WEIGHTS = {
  deadlineProximity: 0.25,
  cognitiveLoad: 0.25,
  dependencyWeight: 0.20,
  historicalPerformance: 0.20,
  interruptionRisk: 0.10,
};

// ── Quest Statuses ──
export const QUEST_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  AVOIDED: 'avoided',
};

// ── Mission Statuses ──
export const MISSION_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

// ── Badge Definitions ──
export const BADGES = {
  first_quest: {
    id: 'first_quest',
    name: 'First Step',
    description: 'Complete your first quest',
    emoji: '🌟',
    icon: '⭐',
  },
  streak_7: {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7-day focus streak',
    emoji: '🔥',
    icon: '🔥',
  },
  streak_30: {
    id: 'streak_30',
    name: 'Unstoppable',
    description: '30-day focus streak',
    emoji: '💎',
    icon: '💎',
  },
  boss_slayer: {
    id: 'boss_slayer',
    name: 'Boss Slayer',
    description: 'Defeat your first boss battle',
    emoji: '🐉',
    icon: '⚔️',
  },
  focus_lock_master: {
    id: 'focus_lock_master',
    name: 'Focus Lock Master',
    description: 'Complete 5 Focus Locked quests on time',
    emoji: '🔒',
    icon: '🔒',
  },
  proof_master: {
    id: 'proof_master',
    name: 'Proof Master',
    description: 'Submit proof for 5 quest completions',
    emoji: '📸',
    icon: '✅',
  },
  recovery_hero: {
    id: 'recovery_hero',
    name: 'Recovery Hero',
    description: 'Return after missing 3+ days',
    emoji: '🦅',
    icon: '🦅',
  },
  level_10: {
    id: 'level_10',
    name: 'Focused Rank',
    description: 'Reach level 10',
    emoji: '🎯',
    icon: '🎯',
  },
  perfect_mission: {
    id: 'perfect_mission',
    name: 'Mission Perfect',
    description: 'Complete all quests in a mission on time',
    emoji: '💯',
    icon: '💯',
  },
  five_star_quest: {
    id: 'five_star_quest',
    name: 'Challenge Accepted',
    description: 'Complete a 5-star difficulty quest',
    emoji: '🌟',
    icon: '⭐',
  },
  duel_victor: {
    id: 'duel_victor',
    name: 'Duel Victor',
    description: 'Win your first duel',
    emoji: '🤺',
    icon: '🤺',
  },
  duel_streak: {
    id: 'duel_streak',
    name: 'Undefeated',
    description: 'Win 5 duels in a row',
    emoji: '👑',
    icon: '👑',
  },
  the_sloth: {
    id: 'the_sloth',
    name: 'The Sloth',
    description: 'Dropped 3 or more active tasks',
    emoji: '🦥',
    icon: '🦥',
  },
};

// ── Penalty Constants ──
export const PENALTY_CONSTANTS = {
  DUEL_DROP_HP: 10,
  SOLO_DROP_XP: 50,
  SOLO_DROP_COINS: 10,
  MAX_DROPS_BEFORE_SLOTH: 3,
  PERFECT_STREAK_TO_REMOVE_SLOTH: 5,
};

// ── Mastery Badges (earned via AI evaluation) ──
export const MASTERY_BADGES = {
  design_maestro: {
    id: 'design_maestro', name: 'Design Maestro', emoji: '🎨', icon: '🎨',
    description: 'Score 5/5 on a design challenge', category: 'design',
  },
  wordsmith: {
    id: 'wordsmith', name: 'Wordsmith', emoji: '✍️', icon: '✍️',
    description: 'Score 5/5 on a writing challenge', category: 'writing',
  },
  code_ninja: {
    id: 'code_ninja', name: 'Code Ninja', emoji: '💻', icon: '💻',
    description: 'Score 5/5 on a coding challenge', category: 'coding',
  },
  iron_will: {
    id: 'iron_will', name: 'Iron Will', emoji: '💪', icon: '💪',
    description: 'Score 5/5 on a fitness challenge', category: 'fitness',
  },
  big_brain: {
    id: 'big_brain', name: 'Big Brain', emoji: '🧠', icon: '🧠',
    description: 'Score 5/5 on a reasoning challenge', category: 'reasoning',
  },
  scholar: {
    id: 'scholar', name: 'Scholar', emoji: '📚', icon: '📚',
    description: 'Score 5/5 on a learning challenge', category: 'learning',
  },
  hackathon_basher: {
    id: 'hackathon_basher', name: 'Hackathon Basher', emoji: '⚡', icon: '⚡',
    description: 'Complete a hackathon challenge with certificate', category: 'hackathon',
  },
  perfectionist_ripper: {
    id: 'perfectionist_ripper', name: 'Perfectionist Ripper', emoji: '💎', icon: '💎',
    description: 'Score 5/5 on 3 tasks in a row', category: 'streak',
  },
  coin_collector: {
    id: 'coin_collector', name: 'Coin Collector', emoji: '🪙', icon: '🪙',
    description: 'Earn 1000 total coins', category: 'economy',
  },
  big_spender: {
    id: 'big_spender', name: 'Big Spender', emoji: '💰', icon: '💰',
    description: 'Redeem your first reward', category: 'economy',
  },
  event_champion: {
    id: 'event_champion', name: 'Event Champion', emoji: '🏅', icon: '🏅',
    description: 'Upload 3 event certificates', category: 'events',
  },
};

// ── Rewards Store Items ──
export const STORE_ITEMS = [
  { id: 'phone_wallpaper', name: 'Exclusive Wallpaper Pack', description: '10 premium wallpapers',
    price: 1000, emoji: '📱', category: 'digital' },
  { id: 'sticker_pack', name: 'LifeQuest Sticker Pack', description: '5 premium holographic stickers',
    price: 2000, emoji: '✨', category: 'stickers' },
  { id: 'notebook', name: 'Quest Journal', description: 'Premium hardcover notebook',
    price: 3000, emoji: '📓', category: 'accessories' },
  { id: 'mug', name: 'Quest Complete Mug', description: 'Ceramic mug — "I completed the quest"',
    price: 3500, emoji: '☕', category: 'accessories' },
  { id: 'tshirt', name: 'LifeQuest T-Shirt', description: 'Premium cotton tee with LifeQuest logo',
    price: 5000, emoji: '👕', category: 'apparel' },
  { id: 'hoodie', name: 'Legend Rank Hoodie', description: 'Premium hoodie for legends only',
    price: 8000, emoji: '🧥', category: 'apparel' },
];

// ── Season Badges ──
export const SEASON_BADGES = {
  summer_grinder_2026: {
    id: 'summer_grinder_2026',
    name: 'Summer Grinder 2026',
    description: 'Complete 10+ quests during Summer 2026',
    emoji: '☀️',
    icon: '☀️',
    season: 'Summer 2026',
    startDate: '2026-06-01',
    endDate: '2026-08-31',
    requirement: 10,
  },
  early_adopter: {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Joined LifeQuest AI during launch week',
    emoji: '🚀',
    icon: '🚀',
    season: 'Launch',
    startDate: '2026-06-27',
    endDate: '2026-07-04',
    requirement: 1,
  },
  hackathon_hero: {
    id: 'hackathon_hero',
    name: 'Hackathon Hero',
    description: 'Active during Vibe2Ship Hackathon',
    emoji: '💻',
    icon: '💻',
    season: 'Vibe2Ship',
    startDate: '2026-06-27',
    endDate: '2026-06-29',
    requirement: 1,
  },
};

// ── Onboarding Questions ──
export const ONBOARDING_QUESTIONS = [
  {
    id: 1,
    question: "When you have a big task due next week, what do you usually do?",
    options: [
      { text: "I know I should start but I keep putting it off", archetype: 'procrastinator', weight: 3 },
      { text: "I start but spend too long perfecting the first part", archetype: 'perfectionist', weight: 3 },
      { text: "I plan it out but always run out of time", archetype: 'poor_estimator', weight: 3 },
      { text: "I have so many other things to do, it gets buried", archetype: 'overloaded', weight: 3 },
    ],
  },
  {
    id: 2,
    question: "What best describes why you've missed deadlines in the past?",
    options: [
      { text: "I couldn't bring myself to start", archetype: 'procrastinator', weight: 3 },
      { text: "I started but wasn't happy with the quality", archetype: 'perfectionist', weight: 3 },
      { text: "I thought I had more time than I actually did", archetype: 'poor_estimator', weight: 3 },
      { text: "I don't really see why the task matters", archetype: 'low_motivation', weight: 3 },
    ],
  },
  {
    id: 3,
    question: "When you open your task list, how do you feel?",
    options: [
      { text: "Overwhelmed — everything looks too hard to start", archetype: 'procrastinator', weight: 2 },
      { text: "Anxious — worried I won't do things well enough", archetype: 'perfectionist', weight: 2 },
      { text: "Confused — not sure what to prioritize", archetype: 'overloaded', weight: 2 },
      { text: "Indifferent — I don't feel connected to these goals", archetype: 'low_motivation', weight: 2 },
    ],
  },
  {
    id: 4,
    question: "If a task is due in 3 days, when would you typically start?",
    options: [
      { text: "The night before or the morning of", archetype: 'procrastinator', weight: 2 },
      { text: "Right away, but I'd spend all 3 days perfecting it", archetype: 'perfectionist', weight: 2 },
      { text: "I'd start on day 2 thinking I have plenty of time", archetype: 'poor_estimator', weight: 2 },
      { text: "Depends on what else is on my plate — probably late", archetype: 'overloaded', weight: 2 },
    ],
  },
  {
    id: 5,
    question: "What would motivate you most to complete a task?",
    options: [
      { text: "Breaking it into tiny, easy steps", archetype: 'procrastinator', weight: 2 },
      { text: "Knowing a rough draft is acceptable", archetype: 'perfectionist', weight: 2 },
      { text: "Seeing exactly how much time I need", archetype: 'poor_estimator', weight: 2 },
      { text: "Feeling like the goal truly matters to me", archetype: 'low_motivation', weight: 2 },
    ],
  },
  {
    id: 6,
    question: "How do you react when you get a reminder notification?",
    options: [
      { text: "I snooze it — I'll do it later", archetype: 'procrastinator', weight: 2 },
      { text: "I open the task but close it if I can't do it perfectly right now", archetype: 'perfectionist', weight: 2 },
      { text: "I'm surprised — I thought I still had time", archetype: 'poor_estimator', weight: 2 },
      { text: "I ignore it — there are more urgent things", archetype: 'overloaded', weight: 2 },
    ],
  },
  {
    id: 7,
    question: "What's your biggest frustration with productivity tools?",
    options: [
      { text: "They don't help me actually START the work", archetype: 'procrastinator', weight: 2 },
      { text: "They don't understand that I need structure, not just reminders", archetype: 'perfectionist', weight: 2 },
      { text: "They don't account for how long things actually take", archetype: 'poor_estimator', weight: 2 },
      { text: "They add more to my plate instead of simplifying", archetype: 'overloaded', weight: 2 },
    ],
  },
  {
    id: 8,
    question: "When you finally complete something, what do you feel?",
    options: [
      { text: "Relief — glad it's over, but drained", archetype: 'procrastinator', weight: 1 },
      { text: "Unsatisfied — I could have done it better", archetype: 'perfectionist', weight: 1 },
      { text: "Rushed — wish I'd had more time", archetype: 'poor_estimator', weight: 1 },
      { text: "Empty — checking a box doesn't excite me", archetype: 'low_motivation', weight: 1 },
    ],
  },
];

// ── Bad Badges (penalties — visible to the user) ──
export const BAD_BADGES = {
  the_sloth: {
    id: 'the_sloth', name: 'The Sloth', icon: '🦥',
    description: 'Dropped 3 or more active tasks.', bad: true,
  },
  the_latecomer: {
    id: 'the_latecomer', name: 'The Latecomer', icon: '🐌',
    description: 'Submitted tasks after the deadline 3+ times.', bad: true,
  },
  the_ghost: {
    id: 'the_ghost', name: 'The Ghost', icon: '👻',
    description: 'Abandoned a duel challenge.', bad: true,
  },
};

// ── Antidote Badges (redeem these to cancel a bad badge) ──
// requirement.type is checked against derived user stats; costCoins is the redemption price.
export const ANTIDOTE_BADGES = {
  sloth_basher: {
    id: 'sloth_basher', name: 'Sloth Basher', icon: '⚡',
    description: 'Crush The Sloth. Hold a 5-task perfect streak, then redeem to wipe it clean.',
    cancels: 'the_sloth', requirement: { type: 'perfectStreak', value: 5 },
    costCoins: 150, color: '#22c55e',
  },
  punctuality_paragon: {
    id: 'punctuality_paragon', name: 'Punctuality Paragon', icon: '⏱️',
    description: 'Erase The Latecomer. Complete 5 tasks on time, then redeem.',
    cancels: 'the_latecomer', requirement: { type: 'onTimeStreak', value: 5 },
    costCoins: 150, color: '#22d3ee',
  },
  redemption_runner: {
    id: 'redemption_runner', name: 'Redemption Runner', icon: '🔥',
    description: 'Banish The Ghost. Win a duel, then redeem to clear your record.',
    cancels: 'the_ghost', requirement: { type: 'duelWins', value: 1 },
    costCoins: 200, color: '#ec4899',
  },
};

// ── Secret Badges (AI-awarded silently for off-platform achievements) ──
export const SECRET_BADGES = {
  contest_crusher: {
    id: 'contest_crusher', name: 'Contest Crusher', icon: '🏆',
    description: 'Quietly tracked: a serial competitor across multiple contests.',
    threshold: 2, hpBoost: 200, coinBoost: 100, secret: true,
  },
  hackathon_phantom: {
    id: 'hackathon_phantom', name: 'Hackathon Phantom', icon: '👾',
    description: 'Quietly tracked: a relentless hackathon participant.',
    threshold: 2, hpBoost: 300, coinBoost: 150, secret: true,
  },
  certified_legend: {
    id: 'certified_legend', name: 'Certified Legend', icon: '📜',
    description: 'Quietly tracked: a collector of verified achievements.',
    threshold: 3, hpBoost: 250, coinBoost: 125, secret: true,
  },
};

// Coins awarded for a verified certificate, scaled by AI significance (1-5). Range 1-500.
export const CERT_COINS_BY_SIGNIFICANCE = { 1: 50, 2: 150, 3: 300, 4: 400, 5: 500 };

// ── Accent Theme Palette (Settings → theme picker) ──
export const ACCENT_THEMES = [
  { id: 'cyan', name: 'Plasma Cyan', color: '#22d3ee', glow: 'rgba(34,211,238,0.40)', soft: 'rgba(34,211,238,0.15)' },
  { id: 'violet', name: 'Void Violet', color: '#a855f7', glow: 'rgba(168,85,247,0.40)', soft: 'rgba(168,85,247,0.15)' },
  { id: 'magenta', name: 'Neon Magenta', color: '#ec4899', glow: 'rgba(236,72,153,0.40)', soft: 'rgba(236,72,153,0.15)' },
  { id: 'gold', name: 'Champion Gold', color: '#fbbf24', glow: 'rgba(251,191,36,0.40)', soft: 'rgba(251,191,36,0.15)' },
  { id: 'emerald', name: 'Matrix Emerald', color: '#22c55e', glow: 'rgba(34,197,94,0.40)', soft: 'rgba(34,197,94,0.15)' },
];

// ── Notification types ──
export const NOTIF_TYPES = {
  DUEL_CHALLENGE: 'duel_challenge',
  DUEL_RESULT: 'duel_result',
  BADGE: 'badge',
  COINS: 'coins',
  LEVEL_UP: 'level_up',
  CERT: 'cert',
  PENALTY: 'penalty',
};

// ── Navigation Items ──
export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Quests', icon: '⚔️' },
  { path: '/duels', label: 'Duels', icon: '🤺' },
  { path: '/rewards', label: 'Rewards', icon: '🪙' },
  { path: '/leaderboard', label: 'Rank', icon: '🏆' },
  { path: '/profile', label: 'Profile', icon: '👤' },
];
