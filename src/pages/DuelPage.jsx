import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createDuel, joinDuel, declineDuel, submitChallengeResult, getUserDuels, dropDuelChallenge } from '../services/duelService';
import { suggestDuelChallenges, refineChallengePrompt, evaluateTaskSubmission, generateDuelMissionTree, decidePenalty } from '../services/aiService';
import { awardDuelCoins, calculateCoinsFromEvaluation, awardCoins } from '../services/coinService';
import { pushNotification } from '../services/notificationService';
import { CHALLENGE_CATEGORIES, DUEL_TYPES, SCORE_LABELS, NOTIF_TYPES } from '../utils/constants';
import { Swords, Trophy, Plus, Clock, Skull } from 'lucide-react';
import './DuelPage.css';

export default function DuelPage() {
  const { user, userData, updateUserData } = useAuth();
  const [duels, setDuels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [activeDuelView, setActiveDuelView] = useState(null);
  const [resultsId, setResultsId] = useState(null);

  const loadDuels = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getUserDuels(user.uid, user.email);
      setDuels(data);
    } catch (err) {
      console.error('Failed to load duels:', err);
    }
    setLoading(false);
  };

  useEffect(() => { loadDuels(); }, [user]);

  const handleAccept = async (duelId) => {
    setProcessing(duelId);
    try {
      const duel = duels.find((d) => d.id === duelId);
      await joinDuel(duelId, user.uid, userData?.displayName, user.photoURL, user.email);
      if (duel?.creatorId && duel.creatorId !== user.uid) {
        await pushNotification(duel.creatorId, {
          type: NOTIF_TYPES.DUEL_CHALLENGE,
          title: `⚔️ ${userData?.displayName || 'A challenger'} accepted your duel`,
          body: duel.challenges?.[0]?.title || 'Your duel is now live.',
          icon: '⚔️',
        });
      }
      await loadDuels();
    } catch (err) { console.error(err); }
    setProcessing(null);
  };

  const handleDecline = async (duelId) => {
    setProcessing(duelId);
    try {
      await declineDuel(duelId);
      await loadDuels();
    } catch (err) { console.error(err); }
    setProcessing(null);
  };

  const pendingIncoming = duels.filter(d =>
    d.status === 'pending' &&
    (d.invitedEmails?.includes(user?.email?.toLowerCase()) || d.opponentEmail === user?.email?.toLowerCase()) &&
    d.creatorId !== user?.uid && d.challengerId !== user?.uid
  );
  const activeDuels = duels.filter(d => d.status === 'active');
  const pendingOutgoing = duels.filter(d =>
    d.status === 'pending' && (d.creatorId === user?.uid || d.challengerId === user?.uid)
  );
  const completedDuels = duels.filter(d => d.status === 'completed' || d.status === 'declined');

  // Win/Loss record for the arena stat row
  const settled = completedDuels.filter(d => d.status === 'completed' && d.winnerId);
  const wins = settled.filter(d => d.winnerId === user?.uid).length;
  const losses = settled.filter(d => d.winnerId !== user?.uid).length;
  let winStreak = 0;
  for (const d of settled) { if (d.winnerId === user?.uid) winStreak++; else break; }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner--lg" />
        <p className="text-muted">Loading duels...</p>
      </div>
    );
  }

  return (
    <div className="duel-page" id="duel-page">
      <div className="duel-arena__top">
        <p className="hud-eyebrow">PvP Arena</p>
        <div className="duel-arena__title-row">
          <h1 className="screen-title">Duels <span className="text-gradient-xp">Arena</span></h1>
          <button className="duel-arena__challenge glow-cyan" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Challenge
          </button>
        </div>
        <p className="screen-sub">Challenge friends. Compete. Earn coins &amp; XP.</p>
      </div>

      {/* Record */}
      <div className="duel-arena__stats">
        <div className="hud-panel arena-stat">
          <div className="arena-stat__value text-success">{wins}</div>
          <div className="arena-stat__label">Wins</div>
        </div>
        <div className="hud-panel arena-stat">
          <div className="arena-stat__value text-danger">{losses}</div>
          <div className="arena-stat__label">Losses</div>
        </div>
        <div className="hud-panel arena-stat">
          <div className="arena-stat__value text-gold">{winStreak}W</div>
          <div className="arena-stat__label">Streak</div>
        </div>
      </div>

      {/* Incoming Challenges */}
      {pendingIncoming.length > 0 && (
        <div className="duel-page__section animate-fade-in-up delay-1">
          <h3 className="duel-page__section-title">
            <span>⚡</span> Incoming Challenges
            <span className="duel-page__badge duel-page__badge--danger">{pendingIncoming.length}</span>
          </h3>
          {pendingIncoming.map(duel => (
            <div key={duel.id} className="duel-card glass-card glass-card--glow-purple">
              <div className="duel-card__header">
                <div className="duel-card__challenger">
                  {(duel.creatorPhoto || duel.challengerPhoto) ? (
                    <img src={duel.creatorPhoto || duel.challengerPhoto} alt="" className="duel-card__avatar" />
                  ) : (
                    <span className="duel-card__avatar-fallback">⚔️</span>
                  )}
                  <div>
                    <span className="font-bold">{duel.creatorName || duel.challengerName}</span>
                    <span className="text-xs text-muted">challenges you!</span>
                  </div>
                </div>
                <span className="badge badge--warning">Pending</span>
              </div>

              {/* Show challenges preview */}
              <div className="duel-card__challenges-preview">
                {(duel.challenges || [{ title: duel.questTitle }]).map((ch, i) => (
                  <div key={i} className="duel-card__challenge-chip">
                    <span>{CHALLENGE_CATEGORIES.find(c => c.id === ch.category)?.emoji || '🎯'}</span>
                    <span>{ch.title}</span>
                    {ch.enableAIEvaluation && <span className="duel-card__ai-tag">🤖 AI</span>}
                    {ch.hp && <span className="text-xs text-cyan">+{ch.hp} HP</span>}
                  </div>
                ))}
              </div>

              <div className="duel-card__meta">
                <span className="text-xs text-muted">
                  {duel.participants?.length || 1}/{duel.maxParticipants || 2} players
                </span>
                <span className="text-xs text-cyan">+{duel.totalHP || duel.xpReward} HP</span>
                <span className="text-xs text-muted">{formatDeadline(duel.deadline)}</span>
              </div>

              <div className="duel-card__actions">
                <button
                  className="btn btn--secondary btn--sm flex-1"
                  onClick={() => handleDecline(duel.id)}
                  disabled={processing === duel.id}
                >
                  Decline
                </button>
                <button
                  className="btn btn--success btn--sm flex-1"
                  onClick={() => handleAccept(duel.id)}
                  disabled={processing === duel.id}
                >
                  {processing === duel.id ? <span className="spinner" /> : '⚔️ Accept'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Duels */}
      {activeDuels.length > 0 && (
        <div className="duel-page__section animate-fade-in-up delay-2">
          <h3 className="duel-page__section-title">
            <Swords size={16} className="text-accent" /> Live Duels
            <span className="duel-page__badge">{activeDuels.length}</span>
          </h3>
          {activeDuels.map(duel => (
            <ActiveDuelCard
              key={duel.id}
              duel={duel}
              user={user}
              userData={userData}
              updateUserData={updateUserData}
              onReload={loadDuels}
              expanded={activeDuelView === duel.id}
              onToggle={() => setActiveDuelView(v => v === duel.id ? null : duel.id)}
              onShowResults={() => setResultsId(duel.id)}
            />
          ))}
        </div>
      )}

      {/* Outgoing Pending */}
      {pendingOutgoing.length > 0 && (
        <div className="duel-page__section animate-fade-in-up delay-3">
          <h3 className="duel-page__section-title">
            <span>📤</span> Sent Challenges
            <span className="duel-page__badge">{pendingOutgoing.length}</span>
          </h3>
          {pendingOutgoing.map(duel => (
            <div key={duel.id} className="duel-card glass-card glass-card--no-hover" style={{ opacity: 0.7 }}>
              <div className="duel-card__header">
                <div>
                  <span className="font-bold">{duel.challenges?.[0]?.title || duel.questTitle}</span>
                  <span className="text-xs text-muted"> → {(duel.invitedEmails || [duel.opponentEmail]).join(', ')}</span>
                </div>
                <span className="badge badge--secondary">Waiting</span>
              </div>
              {duel.challenges?.length > 1 && (
                <p className="text-xs text-muted">{duel.challenges.length} challenges • {duel.totalHP} total HP</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Completed Duels */}
      {completedDuels.length > 0 && (
        <div className="duel-page__section animate-fade-in-up delay-4">
          <h3 className="duel-page__section-title">
            <Trophy size={16} className="text-gold" /> Past Duels
          </h3>
          {completedDuels.map(duel => {
            const won = duel.winnerId === user.uid;
            return (
              <div key={duel.id} className={`duel-card glass-card glass-card--no-hover ${won ? 'duel-card--won' : 'duel-card--lost'}`}>
                <div className="duel-card__header">
                  <span className="font-bold">{duel.challenges?.[0]?.title || duel.questTitle}</span>
                  {duel.status === 'declined' ? (
                    <span className="badge badge--secondary">Declined</span>
                  ) : (
                    <span className={`badge ${won ? 'badge--success' : 'badge--danger'}`}>
                      {won ? '🏆 Won!' : '💀 Lost'}
                    </span>
                  )}
                </div>
                {duel.status === 'completed' && (
                  <>
                    <p className="text-xs text-muted">
                      Winner: {duel.winnerName} • +{duel.totalHP || duel.xpReward} HP
                    </p>
                    <button className="btn btn--secondary btn--sm mt-sm" onClick={() => setResultsId(duel.id)}>
                      📊 View Scorecard
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Duel scorecard table */}
      {resultsId && (
        <DuelResultsModal
          duel={duels.find(d => d.id === resultsId)}
          currentUserId={user?.uid}
          onClose={() => setResultsId(null)}
        />
      )}

      {/* Empty State */}
      {duels.length === 0 && (
        <div className="duel-page__empty animate-fade-in-up">
          <span className="duel-page__empty-icon">🤺</span>
          <h3 className="h4">No duels yet!</h3>
          <p className="text-muted text-sm">Challenge friends with custom tasks, AI-evaluated scoring, and coin rewards.</p>
          <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
            ⚔️ Create First Duel
          </button>
        </div>
      )}

      {/* ── Create Duel Wizard Modal ── */}
      {showCreate && (
        <CreateDuelWizard
          user={user}
          userData={userData}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadDuels(); }}
        />
      )}
    </div>
  );
}


/* ══════════════════════════════════════════════════════
   CREATE DUEL WIZARD — Multi-step challenge builder
   ══════════════════════════════════════════════════════ */

function CreateDuelWizard({ user, userData, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Step 1: Players
  const [emails, setEmails] = useState(['']);

  // Step 2: Mode
  const [duelTheme, setDuelTheme] = useState('');
  const [duelType, setDuelType] = useState('custom');
  const [selectedCategory, setSelectedCategory] = useState('custom');

  // Step 3: Challenges
  const [challenges, setChallenges] = useState([{
    title: '', description: '', category: 'custom', difficulty: 3, hp: 100,
    enableAIEvaluation: true, evaluationCriteria: '', submissionType: 'image'
  }]);
  const [aiSuggestions, setAiSuggestions] = useState(null);

  // Step 4: Deadline
  const [deadline, setDeadline] = useState('');

  const addEmail = () => {
    if (emails.length < 4) setEmails([...emails, '']);
  };

  const removeEmail = (idx) => {
    if (emails.length > 1) setEmails(emails.filter((_, i) => i !== idx));
  };

  const updateEmail = (idx, val) => {
    const updated = [...emails];
    updated[idx] = val;
    setEmails(updated);
  };

  const addChallenge = () => {
    setChallenges([...challenges, {
      title: '', description: '', category: selectedCategory, difficulty: 3, hp: 100,
      enableAIEvaluation: true, evaluationCriteria: '', submissionType: 'image'
    }]);
  };

  const removeChallenge = (idx) => {
    if (challenges.length > 1) setChallenges(challenges.filter((_, i) => i !== idx));
  };

  const updateChallenge = (idx, field, value) => {
    const updated = [...challenges];
    updated[idx] = { ...updated[idx], [field]: value };
    setChallenges(updated);
  };

  const handleGenerateAI = async () => {
    if (!duelTheme.trim()) return;
    setAiLoading(true);
    try {
      const result = await generateDuelMissionTree(duelTheme, selectedCategory);
      setChallenges(result.challenges.map((c, i) => ({
        ...c,
        id: `challenge_${i}`,
        order: i,
        enableAIEvaluation: c.enableAIEvaluation !== false,
      })));
      setDuelType('ai_suggested');
      setStep(3);
    } catch (err) {
      console.error(err);
    }
    setAiLoading(false);
  };

  const handleManualBuild = () => {
    setDuelType('custom');
    if (challenges.length === 0 || !challenges[0].title) {
      setChallenges([{ id: 'c1', title: '', description: '', hp: 100, difficulty: 3, enableAIEvaluation: true, category: 'coding' }]);
    }
    setStep(3);
  };

  const handleAISuggest = async () => {
    setAiLoading(true);
    try {
      const result = await suggestDuelChallenges(
        selectedCategory, emails.filter(e => e.trim()).length + 1, 3
      );
      setAiSuggestions(result);
    } catch (err) {
      console.error('AI suggest failed:', err);
    }
    setAiLoading(false);
  };

  const handleRefineChallenge = async (idx) => {
    const ch = challenges[idx];
    if (!ch.title.trim()) return;
    setAiLoading(true);
    try {
      const refined = await refineChallengePrompt(ch.title, ch.category);
      updateChallenge(idx, 'title', refined.title);
      updateChallenge(idx, 'description', refined.description);
      updateChallenge(idx, 'difficulty', refined.difficulty);
      updateChallenge(idx, 'hp', refined.suggestedHP);
      updateChallenge(idx, 'evaluationCriteria', refined.evaluationCriteria);
      updateChallenge(idx, 'submissionType', refined.submissionType || 'image');
    } catch (err) {
      console.error('Refine failed:', err);
    }
    setAiLoading(false);
  };

  const adoptAISuggestion = (suggestion) => {
    setChallenges([...challenges, {
      title: suggestion.title,
      description: suggestion.description,
      category: suggestion.category || selectedCategory,
      difficulty: suggestion.difficulty,
      hp: suggestion.suggestedHP,
      enableAIEvaluation: true,
      evaluationCriteria: suggestion.evaluationCriteria,
      submissionType: suggestion.submissionType || 'image',
    }]);
    setAiSuggestions(null);
    setDuelType('custom');
  };

  const handleCreate = async () => {
    const validEmails = emails.filter(e => e.trim());
    const validChallenges = challenges.filter(c => c.title.trim());
    if (!validEmails.length || !validChallenges.length || !deadline) return;

    setProcessing(true);
    try {
      await createDuel({
        creatorId: user.uid,
        creatorName: userData?.displayName || 'Adventurer',
        creatorPhoto: user.photoURL,
        invitedEmails: validEmails,
        challenges: validChallenges,
        duelType,
        deadline,
        maxParticipants: validEmails.length + 1,
      });
      onCreated();
    } catch (err) {
      console.error('Create duel failed:', err);
    }
    setProcessing(false);
  };

  const totalHP = challenges.reduce((sum, c) => sum + (c.hp || 0), 0);
  const canProceed = {
    1: emails.some(e => e.trim()),
    2: true,
    3: challenges.some(c => c.title.trim()),
    4: !!deadline,
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal duel-wizard">
        <div className="modal__handle" />

        {/* Progress Bar */}
        <div className="duel-wizard__progress">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`duel-wizard__step ${s <= step ? 'duel-wizard__step--active' : ''} ${s < step ? 'duel-wizard__step--done' : ''}`}>
              {s < step ? '✓' : s}
            </div>
          ))}
          <div className="duel-wizard__progress-line">
            <div className="duel-wizard__progress-fill" style={{ width: `${((step - 1) / 3) * 100}%` }} />
          </div>
        </div>

        {/* Step 1: Invite Players */}
        {step === 1 && (
          <div className="duel-wizard__content animate-fade-in-up">
            <h3 className="h4 mb-sm">👥 Invite Players</h3>
            <p className="text-sm text-muted mb-base">Add 1-4 opponents to your duel arena.</p>
            {emails.map((email, idx) => (
              <div key={idx} className="duel-wizard__email-row">
                <input
                  type="email"
                  className="input"
                  placeholder={`Player ${idx + 2}'s email`}
                  value={email}
                  onChange={(e) => updateEmail(idx, e.target.value)}
                />
                {emails.length > 1 && (
                  <button className="btn btn--ghost btn--sm" onClick={() => removeEmail(idx)}>✕</button>
                )}
              </div>
            ))}
            {emails.length < 4 && (
              <button className="btn btn--ghost btn--sm" onClick={addEmail}>
                + Add another player
              </button>
            )}
          </div>
        )}

        {/* Step 2: Define Theme & Mode */}
        {step === 2 && (
          <div className="duel-wizard__content animate-fade-in-up">
            <h3 className="h4 mb-sm">🎮 Duel Theme</h3>
            <p className="text-sm text-muted mb-base">What are you battling over?</p>

            <div className="duel-wizard__field mb-base">
              <input
                type="text"
                className="input"
                placeholder="e.g. Build a landing page, Morning Routine, Learn Rust"
                value={duelTheme}
                onChange={(e) => setDuelTheme(e.target.value)}
              />
            </div>
            
            <label className="text-xs text-muted font-semibold">Category Hint (Optional):</label>
            <div className="duel-wizard__category-grid mb-lg mt-xs">
              {CHALLENGE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className={`duel-wizard__category-chip ${selectedCategory === cat.id ? 'duel-wizard__category-chip--active' : ''}`}
                  style={{ '--cat-color': cat.color }}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>

            <div className="flex" style={{ gap: '1rem', flexDirection: 'column' }}>
              <button 
                className="btn btn--primary btn--lg" 
                onClick={handleGenerateAI}
                disabled={aiLoading || !duelTheme.trim()}
              >
                {aiLoading ? <><span className="spinner" /> Generating...</> : '🧠 Let AI Build Challenges'}
              </button>
              <button 
                className="btn btn--secondary btn--lg" 
                onClick={handleManualBuild}
              >
                ✍️ Add Challenges Manually
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Configure Challenges */}
        {step === 3 && (
          <div className="duel-wizard__content animate-fade-in-up">
            <h3 className="h4 mb-sm">⚔️ Define Challenges</h3>
            <p className="text-sm text-muted mb-base">Set tasks, HP, difficulty, and AI evaluation.</p>

            {challenges.map((ch, idx) => (
              <div key={idx} className="duel-wizard__challenge-form glass-card glass-card--no-hover">
                <div className="duel-wizard__challenge-header">
                  <span className="text-sm font-bold">Challenge {idx + 1}</span>
                  {challenges.length > 1 && (
                    <button className="btn btn--ghost btn--sm" onClick={() => removeChallenge(idx)}>✕</button>
                  )}
                </div>

                <div className="duel-wizard__field">
                  <label className="text-xs text-muted font-semibold">Challenge Title</label>
                  <div className="duel-wizard__title-row">
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Design a logo"
                      value={ch.title}
                      onChange={e => updateChallenge(idx, 'title', e.target.value)}
                    />
                    <button
                      className="btn btn--ghost btn--sm duel-wizard__refine-btn"
                      onClick={() => handleRefineChallenge(idx)}
                      disabled={aiLoading || !ch.title.trim()}
                      title="Let AI refine this challenge"
                    >
                      {aiLoading ? <span className="spinner" /> : '✨'}
                    </button>
                  </div>
                </div>

                <div className="duel-wizard__field">
                  <label className="text-xs text-muted font-semibold">Description</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="What should participants do? (AI fills this if blank)"
                    value={ch.description}
                    onChange={e => updateChallenge(idx, 'description', e.target.value)}
                  />
                </div>

                <div className="duel-wizard__field">
                  <label className="text-xs text-muted font-semibold">Category</label>
                  <div className="duel-wizard__category-grid duel-wizard__category-grid--compact">
                    {CHALLENGE_CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        className={`duel-wizard__category-chip duel-wizard__category-chip--sm ${ch.category === cat.id ? 'duel-wizard__category-chip--active' : ''}`}
                        style={{ '--cat-color': cat.color }}
                        onClick={() => updateChallenge(idx, 'category', cat.id)}
                      >
                        <span>{cat.emoji}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="duel-wizard__row">
                  <div className="duel-wizard__field flex-1">
                    <label className="text-xs text-muted font-semibold">Difficulty</label>
                    <div className="duel-form__difficulty">
                      {[1, 2, 3, 4, 5].map(d => (
                        <button
                          key={d}
                          className={`duel-form__star ${d <= ch.difficulty ? 'duel-form__star--active' : ''}`}
                          onClick={() => updateChallenge(idx, 'difficulty', d)}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="duel-wizard__field flex-1">
                    <label className="text-xs text-muted font-semibold">HP Reward</label>
                    <input
                      type="number"
                      className="input"
                      min="25" max="500" step="25"
                      value={ch.hp}
                      onChange={e => updateChallenge(idx, 'hp', parseInt(e.target.value) || 100)}
                    />
                  </div>
                </div>

                <div className="duel-wizard__ai-toggle">
                  <label className="duel-wizard__toggle-label">
                    <input
                      type="checkbox"
                      checked={ch.enableAIEvaluation}
                      onChange={e => updateChallenge(idx, 'enableAIEvaluation', e.target.checked)}
                    />
                    <span className="duel-wizard__toggle-switch" />
                    <span className="text-sm">🤖 AI Evaluation</span>
                  </label>
                  <span className="text-xs text-muted">
                    {ch.enableAIEvaluation ? 'AI scores submissions 1-5' : 'Self-report completion'}
                  </span>
                </div>
              </div>
            ))}

            <button className="btn btn--ghost btn--sm mt-sm" onClick={addChallenge}>
              + Add another challenge
            </button>

            <div className="duel-wizard__total glass-card glass-card--no-hover mt-base">
              <span className="text-sm font-bold">Total HP</span>
              <span className="text-gradient font-extrabold">{totalHP}</span>
            </div>
          </div>
        )}

        {/* Step 4: Review & Send */}
        {step === 4 && (
          <div className="duel-wizard__content animate-fade-in-up">
            <h3 className="h4 mb-sm">📋 Review & Send</h3>

            <div className="duel-wizard__review glass-card glass-card--no-hover mb-base">
              <div className="duel-wizard__review-row">
                <span className="text-xs text-muted">Players</span>
                <span className="text-sm font-bold">{emails.filter(e => e.trim()).length + 1}</span>
              </div>
              <div className="duel-wizard__review-row">
                <span className="text-xs text-muted">Challenges</span>
                <span className="text-sm font-bold">{challenges.filter(c => c.title.trim()).length}</span>
              </div>
              <div className="duel-wizard__review-row">
                <span className="text-xs text-muted">Total HP</span>
                <span className="text-sm font-bold text-cyan">{totalHP}</span>
              </div>
              <div className="duel-wizard__review-row">
                <span className="text-xs text-muted">AI Evaluated</span>
                <span className="text-sm font-bold">{challenges.filter(c => c.enableAIEvaluation).length} tasks</span>
              </div>
            </div>

            <div className="duel-wizard__review-challenges">
              {challenges.filter(c => c.title.trim()).map((ch, i) => (
                <div key={i} className="duel-wizard__review-challenge">
                  <span>{CHALLENGE_CATEGORIES.find(c => c.id === ch.category)?.emoji || '🎯'}</span>
                  <div>
                    <span className="font-bold text-sm">{ch.title}</span>
                    <span className="text-xs text-muted">
                      {ch.difficulty}★ • {ch.hp} HP {ch.enableAIEvaluation ? '• 🤖 AI' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="duel-wizard__field mt-base">
              <label className="text-xs text-muted font-semibold">Deadline</label>
              <input
                type="datetime-local"
                className="input"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="duel-wizard__nav">
          {step > 1 && (
            <button className="btn btn--secondary flex-1" onClick={() => setStep(s => s - 1)}>
              ← Back
            </button>
          )}
          {step < 4 ? (
            <button
              className="btn btn--primary flex-1"
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed[step]}
            >
              Next →
            </button>
          ) : (
            <button
              className="btn btn--primary flex-1"
              onClick={handleCreate}
              disabled={processing || !deadline}
            >
              {processing ? <><span className="spinner" /> Sending...</> : '⚔️ Send Challenge'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}


/* ══════════════════════════════════════════════════════
   ACTIVE DUEL CARD — Multi-player arena with per-challenge tracking
   ══════════════════════════════════════════════════════ */

function ActiveDuelCard({ duel, user, userData, updateUserData, onReload, expanded, onToggle, onShowResults }) {
  const [submitChallenge, setSubmitChallenge] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState(null);
  const [completedNow, setCompletedNow] = useState(false);

  const isMultiPlayer = duel.participants && duel.participants.length > 0;
  const participants = duel.participants || [];
  const challenges = duel.challenges || [{ id: 'legacy', title: duel.questTitle, hp: duel.xpReward, enableAIEvaluation: false }];
  const myParticipant = participants.find(p => p.id === user.uid);
  const myCompleted = myParticipant?.completedChallenges || {};

  const handleDrop = async (challenge) => {
    // Let the AI decide a fair penalty from task complexity + the user's track record.
    let penalty;
    try {
      penalty = await decidePenalty({
        action: 'drop',
        taskTitle: challenge.title,
        difficulty: challenge.difficulty,
        stakeHP: challenge.hp,
        userStats: {
          tasksDropped: userData?.tasksDropped || 0,
          perfectStreak: userData?.perfectStreak || 0,
          onTimeStreak: userData?.onTimeStreak || 0,
          level: Math.floor((userData?.xp || 0) / 1000),
        },
      });
    } catch {
      penalty = { hpLoss: 10, coinLoss: 0, reason: 'Standard drop penalty applied.' };
    }
    if (!window.confirm(`Drop "${challenge.title}"?\n\n🤖 AI penalty: -${penalty.hpLoss} HP, -${penalty.coinLoss} coins.\n${penalty.reason}`)) return;
    try {
      await dropDuelChallenge(duel.id, user.uid, challenge.id, penalty);
      const newXP = Math.max(0, (userData?.xp || 0) - penalty.hpLoss);
      await updateUserData({
        xp: newXP,
        level: Math.floor(newXP / 1000),
        coins: Math.max(0, (userData?.coins || 0) - penalty.coinLoss),
      });
      await pushNotification(user.uid, {
        type: NOTIF_TYPES.PENALTY,
        title: `⚠️ Dropped: ${challenge.title}`,
        body: `${penalty.reason} (-${penalty.hpLoss} HP, -${penalty.coinLoss} coins)`,
        icon: '⚠️',
      });
      if (onReload) onReload();
    } catch (err) {
      console.error('Failed to drop challenge:', err);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProofFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setProofPreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setProofPreview(null);
    }
  };

  const handleSubmitProof = async (challenge) => {
    setEvaluating(true);
    try {
      let score = 5;
      let aiEvaluation = null;

      if (challenge.enableAIEvaluation) {
        let base64 = null;
        let mimeType = null;

        if (proofFile) {
          const result = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(proofFile);
          });
          base64 = result.split(',')[1];
          mimeType = proofFile.type;
        }

        aiEvaluation = await evaluateTaskSubmission({
          taskTitle: challenge.title,
          taskDescription: challenge.description,
          category: challenge.category,
          evaluationCriteria: challenge.evaluationCriteria,
          submissionBase64: base64,
          submissionMimeType: mimeType,
          submissionText: submissionText || null,
          difficulty: challenge.difficulty,
        });
        score = aiEvaluation.score;

        // Award coins for AI-evaluated task
        const coins = calculateCoinsFromEvaluation(score, challenge.difficulty);
        if (coins > 0) {
          await awardCoins(user.uid, coins, `Duel challenge: ${challenge.title}`, {
            duelId: duel.id,
            category: challenge.category,
            score,
          });
          await updateUserData({ coins: (userData?.coins || 0) + coins });
        }
      }

      const result = await submitChallengeResult(
        duel.id, user.uid, challenge.id, score, aiEvaluation,
        { text: submissionText, type: proofFile ? 'file' : 'text' },
      );
      setEvalResult({ ...aiEvaluation, score, challengeTitle: challenge.title });

      // Check if duel completed and award duel bonuses
      if (result.winnerId) {
        setCompletedNow(true);
        const isWinner = result.winnerId === user.uid;
        await awardDuelCoins(user.uid, duel.id, isWinner);
        // Award XP + track duel wins (used by the Redemption Arc antidote)
        const bonusXP = isWinner ? duel.totalHP || 200 : Math.round((duel.totalHP || 200) * 0.3);
        const newXP = (userData?.xp || 0) + bonusXP;
        await updateUserData({
          xp: newXP,
          level: Math.floor(newXP / 1000),
          duelWins: (userData?.duelWins || 0) + (isWinner ? 1 : 0),
        });
        // Notify every participant of the result
        for (const p of (duel.participants || [])) {
          await pushNotification(p.id, {
            type: NOTIF_TYPES.DUEL_RESULT,
            title: p.id === result.winnerId ? '🏆 You won a duel!' : '⚔️ Duel finished',
            body: `"${challenges[0]?.title || 'Duel'}" — winner: ${result.winnerName}`,
            icon: p.id === result.winnerId ? '🏆' : '⚔️',
          });
        }
      }

      await onReload();
    } catch (err) {
      console.error('Submit proof failed:', err);
    }
    setEvaluating(false);
  };

  return (
    <div className="duel-card glass-card duel-card--active-arena">
      {/* Arena Header */}
      <div className="duel-card__arena-header" onClick={onToggle}>
        <div>
          <h4 className="duel-card__quest-title">
            {challenges[0]?.title || duel.questTitle}
            {challenges.length > 1 && <span className="text-xs text-muted"> +{challenges.length - 1} more</span>}
          </h4>
          <div className="duel-card__meta">
            <span className="text-xs text-cyan">+{duel.totalHP || duel.xpReward} HP</span>
            <span className="text-xs text-muted">{formatDeadline(duel.deadline)}</span>
            <span className="text-xs text-muted">{participants.length} players</span>
          </div>
        </div>
        <div className="duel-card__arena-actions">
          <button
            className="duel-card__scorecard-btn"
            onClick={(e) => { e.stopPropagation(); onShowResults && onShowResults(); }}
            title="View scorecard"
          >
            📊
          </button>
          <span className={`mission-card__chevron ${expanded ? 'mission-card__chevron--open' : ''}`}>▼</span>
        </div>
      </div>

      {/* Participants Row */}
      <div className="duel-card__participants">
        {participants.map(p => {
          const completedCount = Object.keys(p.completedChallenges || {}).length;
          const allDone = completedCount >= challenges.length;
          return (
            <div key={p.id} className={`duel-card__participant ${allDone ? 'duel-card__participant--done' : ''}`}>
              {p.photo ? (
                <img src={p.photo} alt="" className="duel-card__avatar duel-card__avatar--sm" />
              ) : (
                <span className="duel-card__avatar-fallback duel-card__avatar-fallback--sm">🧑</span>
              )}
              <span className="text-xs font-bold">{p.id === user.uid ? 'You' : p.name?.split(' ')[0]}</span>
              <span className="text-xs text-muted">{completedCount}/{challenges.length}</span>
              {allDone && <span className="duel-card__check">✅</span>}
            </div>
          );
        })}
      </div>

      {/* Expanded: Per-challenge tracking */}
      {expanded && (
        <div className="duel-card__challenges-detail animate-fade-in-up">
          {challenges.map(ch => {
            const myResult = myCompleted[ch.id];
            const isDone = !!myResult;

            return (
              <div key={ch.id} className={`duel-card__challenge-item ${isDone ? 'duel-card__challenge-item--done' : ''}`}>
                <div className="duel-card__challenge-info">
                  <span>{CHALLENGE_CATEGORIES.find(c => c.id === ch.category)?.emoji || '🎯'}</span>
                  <div>
                    <span className="text-sm font-bold">{ch.title}</span>
                    <span className="text-xs text-muted">
                      {ch.difficulty}★ • {ch.hp} HP
                      {ch.enableAIEvaluation && ' • 🤖 AI'}
                    </span>
                  </div>
                </div>

                {isDone ? (
                  <div className="duel-card__challenge-result">
                    {myResult.dropped ? (
                      <span className="text-xs text-danger">⚠️ Dropped</span>
                    ) : (
                      <span className="text-xs text-success">✅ {myResult.score}/5</span>
                    )}
                  </div>
                ) : (
                  <div className="flex" style={{ gap: '0.5rem' }}>
                    <button
                      className="btn btn--danger btn--sm"
                      onClick={() => handleDrop(ch)}
                      title="Drop challenge (AI-decided penalty)"
                    >
                      Drop
                    </button>
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={() => setSubmitChallenge(ch)}
                    >
                      Submit
                    </button>
                  </div>
                )}

                {/* Transparency: everyone's score + submission for this challenge */}
                {(() => {
                  const board = participants
                    .map((p) => ({ p, r: p.completedChallenges?.[ch.id] }))
                    .filter((x) => x.r);
                  if (board.length === 0) return null;
                  return (
                    <div className="duel-scoreboard">
                      {board.map(({ p, r }) => (
                        <div key={p.id} className="duel-scoreboard__row">
                          <span className="duel-scoreboard__name">
                            {p.id === user.uid ? 'You' : (p.name?.split(' ')[0] || 'Player')}
                          </span>
                          <span className={`duel-scoreboard__score ${r.dropped ? 'text-danger' : 'text-success'}`}>
                            {r.dropped ? 'Dropped' : `${r.score}/5`}
                          </span>
                          {r.aiEvaluation?.feedback && (
                            <span className="duel-scoreboard__fb">💬 {r.aiEvaluation.feedback}</span>
                          )}
                          {r.submission?.text && (
                            <span className="duel-scoreboard__sub">📝 “{r.submission.text}”</span>
                          )}
                          {r.submission?.type === 'file' && !r.submission?.text && (
                            <span className="duel-scoreboard__sub">📎 File submitted</span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Challenge Modal */}
      {submitChallenge && !evalResult && (
        <>
          <div className="modal-backdrop" onClick={() => { setSubmitChallenge(null); setProofFile(null); setProofPreview(null); setSubmissionText(''); }} />
          <div className="modal">
            <div className="modal__handle" />
            <h3 className="h4 mb-sm">
              {CHALLENGE_CATEGORIES.find(c => c.id === submitChallenge.category)?.emoji || '🎯'}{' '}
              {submitChallenge.title}
            </h3>
            {submitChallenge.description && (
              <p className="text-sm text-muted mb-base">{submitChallenge.description}</p>
            )}

            {submitChallenge.enableAIEvaluation ? (
              <>
                <p className="text-xs text-cyan mb-base">🤖 AI will evaluate your submission and score it 1-5</p>

                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  id="duel-proof-upload"
                />
                <button
                  className="quest-detail__upload-zone mb-base"
                  onClick={() => document.getElementById('duel-proof-upload')?.click()}
                >
                  {proofPreview ? (
                    <img src={proofPreview} alt="Preview" className="quest-detail__proof-preview" />
                  ) : proofFile ? (
                    <div className="quest-detail__file-info">
                      <span>📄</span>
                      <span>{proofFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <span className="quest-detail__upload-icon">📤</span>
                      <span>Upload proof</span>
                      <span className="text-xs text-tertiary">Images, PDFs, Docs</span>
                    </>
                  )}
                </button>

                <textarea
                  className="input"
                  placeholder="Or type your submission here (for writing/reasoning tasks)..."
                  rows={3}
                  value={submissionText}
                  onChange={e => setSubmissionText(e.target.value)}
                  style={{ resize: 'vertical' }}
                />

                <button
                  className="btn btn--primary btn--full mt-base"
                  onClick={() => handleSubmitProof(submitChallenge)}
                  disabled={evaluating || (!proofFile && !submissionText.trim())}
                >
                  {evaluating ? <><span className="spinner" /> AI Evaluating...</> : '🧠 Submit for AI Evaluation'}
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-muted mb-base">Self-report: Mark this challenge as complete.</p>
                <button
                  className="btn btn--success btn--full"
                  onClick={() => handleSubmitProof(submitChallenge)}
                  disabled={evaluating}
                >
                  {evaluating ? <span className="spinner" /> : '✅ Mark Complete'}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* AI Evaluation Result Modal */}
      {evalResult && (
        <>
          <div className="modal-backdrop" onClick={() => { setEvalResult(null); setSubmitChallenge(null); setProofFile(null); setProofPreview(null); setSubmissionText(''); }} />
          <div className="modal">
            <div className="modal__handle" />
            <div className="duel-eval__result animate-fade-in-up">
              <div className="duel-eval__score-badge">
                <span className="duel-eval__score-number">{evalResult.score}/5</span>
                <span className="duel-eval__score-label">{SCORE_LABELS[evalResult.score]?.label || 'Evaluated'}</span>
              </div>
              <p className="text-sm text-center mb-base">{SCORE_LABELS[evalResult.score]?.message}</p>
              {evalResult.feedback && (
                <p className="text-sm text-muted mb-base">💬 {evalResult.feedback}</p>
              )}
              {evalResult.strengths?.length > 0 && (
                <div className="duel-eval__section">
                  <span className="text-xs text-success font-semibold">✅ Strengths</span>
                  {evalResult.strengths.map((s, i) => (
                    <span key={i} className="text-xs text-muted">• {s}</span>
                  ))}
                </div>
              )}
              {evalResult.improvements?.length > 0 && (
                <div className="duel-eval__section">
                  <span className="text-xs text-warning font-semibold">💡 To improve</span>
                  {evalResult.improvements.map((s, i) => (
                    <span key={i} className="text-xs text-muted">• {s}</span>
                  ))}
                </div>
              )}
              {evalResult.score >= 3 && (
                <div className="duel-eval__coins glass-card glass-card--no-hover">
                  <span>🪙</span>
                  <span className="font-bold text-gradient">
                    +{calculateCoinsFromEvaluation(evalResult.score, submitChallenge?.difficulty || 3)} coins earned!
                  </span>
                </div>
              )}
              <button className="btn btn--primary btn--full mt-base" onClick={() => {
                setEvalResult(null);
                setSubmitChallenge(null);
                setProofFile(null);
                setProofPreview(null);
                setSubmissionText('');
                if (completedNow) { setCompletedNow(false); onShowResults && onShowResults(); }
              }}>
                {completedNow ? '📊 View Results' : 'Done'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


function formatDeadline(deadline) {
  if (!deadline) return '';
  const d = deadline?.toDate ? deadline.toDate() : new Date(deadline);
  const diff = d - new Date();
  if (diff < 0) return '⚠️ Overdue';
  if (diff < 3600000) return `${Math.ceil(diff / 60000)}m left`;
  if (diff < 86400000) return `${Math.ceil(diff / 3600000)}h left`;
  return `${Math.ceil(diff / 86400000)}d left`;
}


/* ══════════════════════════════════════════════════════
   DUEL SCORECARD — Player × Task table with submissions
   ══════════════════════════════════════════════════════ */

function DuelResultsModal({ duel, currentUserId, onClose }) {
  if (!duel) return null;
  const challenges = duel.challenges || [];
  const participants = duel.participants || [];

  const totals = participants
    .map((p) => ({
      ...p,
      isMe: p.id === currentUserId,
      total: Object.values(p.completedChallenges || {}).reduce((s, c) => s + (c.score || 0), 0),
    }))
    .sort((a, b) => b.total - a.total);

  const renderSubmission = (r) => {
    if (!r) return <span className="text-tertiary">—</span>;
    if (r.dropped) return <span className="text-danger">Dropped</span>;
    if (r.submission?.text) return <span className="duel-results__quote">“{r.submission.text}”</span>;
    if (r.submission?.type === 'file') return <span>📎 File submitted</span>;
    return <span>Submitted</span>;
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal duel-results">
        <div className="modal__handle" />
        <div className="flex items-center justify-between mb-sm">
          <h3 className="h4">📊 Scorecard</h3>
          <button className="duel-results__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {duel.status === 'completed' && duel.winnerName && (
          <p className="duel-results__winner">🏆 Winner: <strong>{duel.winnerName}</strong></p>
        )}

        {/* Standings */}
        <div className="duel-results__standings">
          {totals.map((p, i) => (
            <div key={p.id} className={`duel-results__stand ${p.id === duel.winnerId ? 'duel-results__stand--win' : ''}`}>
              <span className="duel-results__rank">#{i + 1}</span>
              <span className="duel-results__pname">{p.isMe ? 'You' : (p.name?.split(' ')[0] || 'Player')}</span>
              <span className="duel-results__ptotal">{p.total} pts</span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="duel-results__table-wrap">
          <table className="duel-results__table">
            <thead>
              <tr><th>Player</th><th>Task</th><th>Submission</th><th>Score</th></tr>
            </thead>
            <tbody>
              {participants.map((p) => challenges.map((ch) => {
                const r = p.completedChallenges?.[ch.id];
                return (
                  <tr key={p.id + ch.id} className={p.id === currentUserId ? 'duel-results__me' : ''}>
                    <td>{p.id === currentUserId ? 'You' : (p.name?.split(' ')[0] || 'Player')}</td>
                    <td>{ch.title}</td>
                    <td className="duel-results__sub">{renderSubmission(r)}</td>
                    <td className="duel-results__score">{!r ? '—' : r.dropped ? '0' : `${r.score}/5`}</td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        <button className="btn btn--primary btn--full mt-base" onClick={onClose}>Close</button>
      </div>
    </>
  );
}
