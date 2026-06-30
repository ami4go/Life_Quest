import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuests } from '../contexts/QuestContext';
import { getLevelInfo } from '../utils/levelSystem';
import { BADGES, MASTERY_BADGES, BAD_BADGES, ANTIDOTE_BADGES, SECRET_BADGES } from '../utils/constants';
import { canRedeemAntidote, redeemAntidote, getAntidoteProgress } from '../services/badgeService';
import { Award, Lock, Sparkles } from 'lucide-react';
import './BadgesPage.css';

export default function BadgesPage() {
  const { user, userData, updateUserData } = useAuth();
  const { completedQuests } = useQuests();
  const [processing, setProcessing] = useState(null);

  const levelInfo = getLevelInfo(userData?.xp || 0);
  const stored = new Set(userData?.badges || []);

  // Derive good achievement badges from quest stats (same rules as profile)
  const focus = userData?.streaks?.focus || 0;
  const focusLockedDone = completedQuests.filter((q) => q.focusLocked).length;
  const proofs = completedQuests.filter((q) => q.proofSubmitted).length;
  const unlocked = new Set(stored);
  if (completedQuests.length >= 1) unlocked.add('first_quest');
  if (focus >= 7) unlocked.add('streak_7');
  if (focus >= 30) unlocked.add('streak_30');
  if (levelInfo.level >= 10) unlocked.add('level_10');
  if (completedQuests.some((q) => q.difficulty >= 5)) unlocked.add('five_star_quest');
  if (focusLockedDone >= 5) unlocked.add('focus_lock_master');
  if (proofs >= 5) unlocked.add('proof_master');

  // Build catalogs
  const goodCatalog = [...Object.values(BADGES), ...Object.values(MASTERY_BADGES)];
  const badCatalog = Object.values(BAD_BADGES);
  const secretCatalog = Object.values(SECRET_BADGES);

  const unlockedGood = goodCatalog.filter((b) => unlocked.has(b.id));
  const unlockedBad = badCatalog.filter((b) => unlocked.has(b.id));
  const unlockedSecret = secretCatalog.filter((b) => unlocked.has(b.id));
  const unlockedAntidotes = Object.values(ANTIDOTE_BADGES).filter((b) => unlocked.has(b.id));

  const lockedGood = goodCatalog.filter((b) => !unlocked.has(b.id));
  const lockedBad = badCatalog.filter((b) => !unlocked.has(b.id));

  const allUnlocked = [
    ...unlockedSecret.map((b) => ({ ...b, kind: 'secret' })),
    ...unlockedGood.map((b) => ({ ...b, kind: 'good' })),
    ...unlockedAntidotes.map((b) => ({ ...b, kind: 'good' })),
    ...unlockedBad.map((b) => ({ ...b, kind: 'bad' })),
  ];
  const allLocked = [
    ...lockedGood.map((b) => ({ ...b, kind: 'good' })),
    ...lockedBad.map((b) => ({ ...b, kind: 'bad' })),
  ];

  const handleRedeem = async (antidote) => {
    setProcessing(antidote.id);
    try {
      const { newBadges, coinsSpent } = await redeemAntidote(user.uid, userData, antidote.id);
      await updateUserData({ badges: newBadges, coins: (userData.coins || 0) - coinsSpent });
    } catch (err) {
      alert(err.message || 'Could not redeem this antidote yet.');
    }
    setProcessing(null);
  };

  return (
    <div className="badges2" id="badges-page">
      <section className="badges2__head">
        <p className="hud-eyebrow">Honor Wall</p>
        <h1 className="screen-title">Your <span className="text-gradient-xp">Badges</span></h1>
      </section>

      {/* Unlocked */}
      <section className="badges2__section">
        <div className="section-head">
          <h2 className="section-head__title"><Award size={16} className="text-accent" /> Unlocked</h2>
          <span className="section-head__count">{allUnlocked.length}</span>
        </div>
        {allUnlocked.length === 0 ? (
          <p className="badges2__hint">No badges yet — complete quests and duels to start earning.</p>
        ) : (
          <div className="badges2__grid">
            {allUnlocked.map((b) => <BadgeCard key={b.id} badge={b} unlocked />)}
          </div>
        )}
      </section>

      {/* Redemption Arc — antidotes that cancel bad badges */}
      <section className="badges2__section">
        <div className="section-head">
          <h2 className="section-head__title"><Sparkles size={16} className="text-magenta" /> Redemption Arc</h2>
        </div>
        <p className="badges2__hint">Wipe a penalty badge from your record. Meet the challenge, then redeem the antidote.</p>
        <div className="badges2__arc">
          {Object.values(ANTIDOTE_BADGES).map((a) => {
            const bad = BAD_BADGES[a.cancels];
            const hasBad = (userData?.badges || []).includes(a.cancels);
            const owned = (userData?.badges || []).includes(a.id);
            const progress = getAntidoteProgress(userData)[a.requirement.type] || 0;
            const ready = canRedeemAntidote(userData, a);
            return (
              <div key={a.id} className="hud-panel arc-card" style={{ '--arc': a.color }}>
                <div className="arc-card__icon">{a.icon}</div>
                <div className="arc-card__body">
                  <div className="arc-card__title-row">
                    <h3 className="arc-card__name">{a.name}</h3>
                    <span className="arc-card__cancels">cancels {bad?.icon} {bad?.name}</span>
                  </div>
                  <p className="arc-card__desc">{a.description}</p>
                  <div className="arc-card__meta">
                    <span className="arc-card__prog">
                      {a.requirement.type}: {Math.min(progress, a.requirement.value)}/{a.requirement.value}
                    </span>
                    <span className="arc-card__cost">🪙 {a.costCoins}</span>
                  </div>
                </div>
                <button
                  className={`btn btn--sm ${ready ? 'btn--primary' : 'btn--secondary'}`}
                  disabled={!ready || processing === a.id}
                  onClick={() => handleRedeem(a)}
                >
                  {owned ? 'Redeemed' : !hasBad ? 'No penalty' : processing === a.id ? <span className="spinner" /> : ready ? 'Redeem' : 'Locked'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Locked */}
      <section className="badges2__section">
        <div className="section-head">
          <h2 className="section-head__title"><Lock size={16} className="text-muted" /> Locked</h2>
          <span className="section-head__count">{allLocked.length}</span>
        </div>
        <div className="badges2__grid">
          {allLocked.map((b) => <BadgeCard key={b.id} badge={b} />)}
        </div>
      </section>
    </div>
  );
}

function BadgeCard({ badge, unlocked }) {
  return (
    <div
      className={`badge-card badge-card--${badge.kind} ${unlocked ? 'badge-card--on' : 'badge-card--off'}`}
      title={badge.description}
    >
      <span className="badge-card__icon">{badge.icon}</span>
      <span className="badge-card__name">{badge.name}</span>
      <span className="badge-card__desc">{badge.description}</span>
      {badge.kind === 'bad' && unlocked && <span className="badge-card__tag badge-card__tag--bad">Penalty</span>}
      {badge.kind === 'secret' && <span className="badge-card__tag badge-card__tag--secret">Secret</span>}
    </div>
  );
}
