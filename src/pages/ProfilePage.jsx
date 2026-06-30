import { useAuth } from '../contexts/AuthContext';
import { useQuests } from '../contexts/QuestContext';
import { getLevelInfo } from '../utils/levelSystem';
import { ARCHETYPES, BADGES } from '../utils/constants';
import { XP_PER_LEVEL } from '../utils/constants';
import { Target, Sparkles, Coins, ScrollText, Settings, LogOut, ChevronRight } from 'lucide-react';
import './ProfilePage.css';

const BADGE_TINTS = ['badge-chip--cyan', 'badge-chip--gold', 'badge-chip--magenta', 'badge-chip--success'];

export default function ProfilePage() {
  const { userData, logout } = useAuth();
  const { completedQuests } = useQuests();
  const levelInfo = getLevelInfo(userData?.xp || 0);
  const archetype = userData?.archetype?.primary ? ARCHETYPES[userData.archetype.primary] : null;
  const secondaryArchetype = userData?.archetype?.secondary ? ARCHETYPES[userData.archetype.secondary] : null;

  const focusLockedCompleted = completedQuests.filter(q => q.focusLocked).length;
  const proofsSubmitted = completedQuests.filter(q => q.proofSubmitted).length;

  const earnedBadges = [];
  if (completedQuests.length >= 1) earnedBadges.push(BADGES.first_quest);
  if (userData?.streaks?.focus >= 7) earnedBadges.push(BADGES.streak_7);
  if (userData?.streaks?.focus >= 30) earnedBadges.push(BADGES.streak_30);
  if (focusLockedCompleted >= 5) earnedBadges.push(BADGES.focus_lock_master);
  if (proofsSubmitted >= 5) earnedBadges.push(BADGES.proof_master);
  if (levelInfo.level >= 10) earnedBadges.push(BADGES.level_10);
  if (completedQuests.some(q => q.difficulty >= 5)) earnedBadges.push(BADGES.five_star_quest);
  if (earnedBadges.length === 0) earnedBadges.push(BADGES.first_quest);

  const initial = (userData?.displayName || 'A').trim().charAt(0).toUpperCase();

  return (
    <div className="profile2" id="profile-page">
      {/* Player card */}
      <section className="profile2__pad">
        <div className="hud-panel player-card">
          <div className="player-card__glow player-card__glow--a" />
          <div className="player-card__glow player-card__glow--b" />

          <div className="player-card__inner">
            <div className="player-card__avatar-wrap">
              <div className="player-card__avatar">
                {userData?.photoURL
                  ? <img src={userData.photoURL} alt="" className="player-card__avatar-img" />
                  : initial}
              </div>
              <span className="player-card__lv">LV {levelInfo.level}</span>
            </div>

            <h1 className="player-card__name">{userData?.displayName || 'Adventurer'}</h1>
            <p className="player-card__class">{levelInfo.rank.title} · Operator Class</p>

            {/* XP */}
            <div className="player-card__xp">
              <div className="player-card__xp-row">
                <span className="text-muted">XP to Level {levelInfo.level + 1}</span>
                <span className="text-accent">{levelInfo.xpInLevel} / {XP_PER_LEVEL}</span>
              </div>
              <div className="player-card__xp-bar">
                <div className="player-card__xp-fill shimmer-bar" style={{ width: `${levelInfo.progress}%` }} />
              </div>
            </div>

            <div className="player-card__stats">
              <MiniStat icon={Sparkles} tint="text-accent" value={(userData?.xp || 0).toLocaleString()} label="Total XP" />
              <MiniStat icon={Coins} tint="text-gold" value={(userData?.coins || 0).toLocaleString()} label="Coins" />
              <MiniStat icon={ScrollText} tint="text-magenta" value={userData?.certificatesUploaded || 0} label="Certs" />
            </div>
          </div>
        </div>
      </section>

      {/* Archetype */}
      <section className="profile2__pad">
        <div className="section-head">
          <h2 className="section-head__title"><Target size={16} className="text-accent" /> Your Archetype</h2>
        </div>
        {archetype ? (
          <div className="hud-panel archetype-card">
            <div className="archetype-card__row">
              <div className="archetype-card__icon" style={{ background: 'rgba(192,132,252,0.15)' }}>
                <span style={{ fontSize: '1.5rem' }}>{archetype.emoji}</span>
              </div>
              <div className="archetype-card__body">
                <div className="archetype-card__head">
                  <span className="archetype-card__chip">Epic</span>
                  <h3 className="archetype-card__name">{archetype.name}</h3>
                </div>
                <p className="archetype-card__desc">{archetype.description} {archetype.fix}</p>
              </div>
            </div>
            {secondaryArchetype && (
              <div className="archetype-card__secondary">
                <span className="archetype-card__sec-label">Secondary</span>
                <span className="archetype-card__sec-name">{secondaryArchetype.name}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="hud-panel archetype-card archetype-card--empty">
            <p className="text-sm text-muted">Complete onboarding to reveal your archetype.</p>
          </div>
        )}
      </section>

      {/* Badges */}
      <section className="profile2__pad">
        <div className="section-head">
          <h2 className="section-head__title">Badges</h2>
        </div>
        <div className="badge-chips">
          {earnedBadges.map((b, i) => (
            <span key={b.id} className={`badge-chip ${BADGE_TINTS[i % BADGE_TINTS.length]}`}>
              {b.icon} {b.name}
            </span>
          ))}
        </div>
      </section>

      {/* Actions */}
      <section className="profile2__pad">
        <ul className="hud-panel action-list">
          <li>
            <button className="action-row">
              <Settings size={16} /><span>Settings</span><ChevronRight size={16} className="action-row__chev" />
            </button>
          </li>
          <li>
            <button className="action-row action-row--danger" onClick={logout}>
              <LogOut size={16} /><span>Sign out</span><ChevronRight size={16} className="action-row__chev" />
            </button>
          </li>
        </ul>
      </section>
    </div>
  );
}

function MiniStat({ icon: Icon, tint, value, label }) {
  return (
    <div className="mini-stat">
      <Icon size={16} className={`mini-stat__icon ${tint}`} />
      <div className="mini-stat__value">{value}</div>
      <div className="mini-stat__label">{label}</div>
    </div>
  );
}
