import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useQuests } from '../contexts/QuestContext';
import { calculateQuestXP, calculateMissedPenalty } from '../utils/xpCalculator';
import { diagnoseAvoidance, verifyProof, evaluateTaskSubmission, verifyCertificate } from '../services/aiService';
import { calculateCoinsFromEvaluation, awardCoins, awardCertificateBonus } from '../services/coinService';
import { trackSecretAchievement } from '../services/badgeService';
import { pushNotification } from '../services/notificationService';
import { SCORE_LABELS, CHALLENGE_CATEGORIES, CERT_COINS_BY_SIGNIFICANCE, NOTIF_TYPES } from '../utils/constants';
import { ArrowLeft } from 'lucide-react';
import './QuestDetailPage.css';

export default function QuestDetailPage() {
  const { questId } = useParams();
  const navigate = useNavigate();
  const { user, userData, updateUserData } = useAuth();
  const { quests } = useQuests();
  const quest = quests.find((q) => q.id === questId);

  const [showFocusLock, setShowFocusLock] = useState(false);
  const [showProofUpload, setShowProofUpload] = useState(false);
  const [showAntiAvoidance, setShowAntiAvoidance] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [avoidanceData, setAvoidanceData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [showCertUpload, setShowCertUpload] = useState(false);
  const [certFile, setCertFile] = useState(null);
  const [certPreview, setCertPreview] = useState(null);
  const [certDescription, setCertDescription] = useState('');
  const [certResult, setCertResult] = useState(null);
  const [certProcessing, setCertProcessing] = useState(false);
  const [certCoins, setCertCoins] = useState(0);
  const fileInputRef = useRef(null);
  const certInputRef = useRef(null);

  // Track opens for anti-avoidance
  useEffect(() => {
    if (quest && quest.status !== 'completed') {
      const newCount = (quest.avoidanceCount || 0) + 1;
      updateDoc(doc(db, 'quests', questId), { avoidanceCount: newCount });
      if (newCount >= 3 && !quest.avoidanceResolution) {
        triggerAntiAvoidance();
      }
    }
  }, [questId]);

  // Countdown timer
  useEffect(() => {
    if (!quest?.deadline) return;
    const interval = setInterval(() => {
      const dl = quest.deadline?.toDate ? quest.deadline.toDate() : new Date(quest.deadline);
      const diff = dl - new Date();
      if (diff <= 0) {
        setTimeRemaining('OVERDUE');
      } else {
        const days = Math.floor(diff / 86400000);
        const hrs = Math.floor((diff % 86400000) / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(
          days > 0 ? `${days}d ${hrs}h ${mins}m` : `${hrs}h ${mins}m ${secs}s`
        );
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [quest?.deadline]);

  const triggerAntiAvoidance = async () => {
    if (!quest || !userData?.archetype) return;
    setIsProcessing(true);
    try {
      const result = await diagnoseAvoidance(
        quest.title,
        quest.description,
        userData.archetype,
        quest.avoidanceCount || 3
      );
      setAvoidanceData(result);
      setShowAntiAvoidance(true);
    } catch (err) {
      console.error('Anti-avoidance failed:', err);
    }
    setIsProcessing(false);
  };

  const handleFocusLock = async () => {
    await updateDoc(doc(db, 'quests', questId), {
      focusLocked: !quest.focusLocked,
      focusLockedAt: quest.focusLocked ? null : Timestamp.now(),
    });
    setShowFocusLock(false);
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

  const handleProofSubmit = async () => {
    if (!proofFile) return;
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result.split(',')[1];

        // Use the new universal AI evaluator
        const result = await evaluateTaskSubmission({
          taskTitle: quest.title,
          taskDescription: quest.description,
          category: quest.category || 'custom',
          submissionBase64: base64,
          submissionMimeType: proofFile.type,
          difficulty: quest.difficulty,
        });

        // Map to legacy format for backward compat
        const legacyResult = {
          match: result.score >= 3,
          qualityScore: result.score,
          feedback: result.feedback,
          bonusXPReason: result.score >= 3 ? result.categoryInsight : null,
          // Enhanced fields
          scoreLabel: result.scoreLabel,
          strengths: result.strengths,
          improvements: result.improvements,
        };
        setVerificationResult(legacyResult);

        // Award coins for AI-evaluated task
        const coins = calculateCoinsFromEvaluation(result.score, quest.difficulty);
        if (coins > 0 && user) {
          await awardCoins(user.uid, coins, `Quest: ${quest.title}`, {
            taskId: questId,
            category: quest.category || 'custom',
            score: result.score,
          });
          setCoinsEarned(coins);
          await updateUserData({ coins: (userData?.coins || 0) + coins });
        }

        await updateDoc(doc(db, 'quests', questId), {
          proofSubmitted: true,
          proofData: {
            fileName: proofFile.name,
            aiVerification: {
              match: legacyResult.match,
              qualityScore: result.score,
              scoreLabel: result.scoreLabel,
              feedback: result.feedback,
              strengths: result.strengths,
              improvements: result.improvements,
              coinsEarned: coins,
              verifiedAt: Timestamp.now(),
            },
          },
        });
        setIsProcessing(false);
      };
      reader.readAsDataURL(proofFile);
    } catch (err) {
      console.error('Proof verification failed:', err);
      setIsProcessing(false);
    }
  };

  const handleCertFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCertFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setCertPreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setCertPreview(null);
    }
  };

  const handleCertSubmit = async () => {
    if (!certFile) return;
    setCertProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result.split(',')[1];
        const result = await verifyCertificate(base64, certFile.type, certDescription);
        setCertResult(result);

        if (result.isValid && user) {
          // AI significance (1-5) → coins (1-500)
          const coins = CERT_COINS_BY_SIGNIFICANCE[result.significance] || 100;
          setCertCoins(coins);
          const { newBalance } = await awardCertificateBonus(
            user.uid, result.summary || certDescription, { taskId: questId }, coins,
          );
          await updateUserData({
            coins: newBalance,
            certificatesUploaded: (userData?.certificatesUploaded || 0) + 1,
          });
          await pushNotification(user.uid, {
            type: NOTIF_TYPES.CERT,
            title: `📜 Certificate verified (+${coins} coins)`,
            body: result.summary || certDescription || 'Achievement recognised by AI.',
            icon: '🏅',
          });
          // Secretly track contest/hackathon grind → may award a secret badge + boosts
          await trackSecretAchievement(user.uid, result.eventType);
        }
        setCertProcessing(false);
      };
      reader.readAsDataURL(certFile);
    } catch (err) {
      console.error('Certificate verification failed:', err);
      setCertProcessing(false);
    }
  };

  const handleCompleteQuest = async () => {
    if (!quest) return;
    setIsProcessing(true);

    const now = new Date();
    const deadline = quest.deadline?.toDate ? quest.deadline.toDate() : new Date(quest.deadline);
    const onTime = now <= deadline;

    const xpBreakdown = calculateQuestXP({
      difficulty: quest.difficulty,
      onTime,
      early: onTime && (deadline - now) > 3600000,
      focusLocked: quest.focusLocked,
      isBossBattle: false,
      streakDays: userData?.streaks?.focus || 0,
      proofSubmitted: quest.proofSubmitted,
      proofQuality: quest.proofData?.aiVerification?.qualityScore || 0,
    });

    await updateDoc(doc(db, 'quests', questId), {
      status: 'completed',
      completedAt: Timestamp.now(),
    });

    const newXP = (userData?.xp || 0) + xpBreakdown.total;
    await updateUserData({
      xp: newXP,
      level: Math.floor(newXP / 1000),
      perfectStreak: (userData?.perfectStreak || 0) + 1,
      onTimeStreak: onTime ? (userData?.onTimeStreak || 0) + 1 : 0,
    });

    if (user) {
      await pushNotification(user.uid, {
        type: NOTIF_TYPES.LEVEL_UP,
        title: `✅ Quest complete: ${quest.title}`,
        body: `+${xpBreakdown.total} XP earned.`,
        icon: '⚔️',
      });
    }

    // Auto-complete mission check
    const missionQuests = quests.filter((q) => q.missionId === quest.missionId);
    const doneCount = missionQuests.filter((q) => q.status === 'completed' || q.id === questId).length;
    if (missionQuests.length > 0 && doneCount === missionQuests.length) {
      await updateDoc(doc(db, 'missions', quest.missionId), {
        status: 'completed',
        completedAt: Timestamp.now(),
      });
    }

    setXpAwarded(xpBreakdown);
    setIsProcessing(false);
  };

  const handleAcceptRestructure = async () => {
    if (!avoidanceData?.restructuredQuest) return;
    const rq = avoidanceData.restructuredQuest;
    await updateDoc(doc(db, 'quests', questId), {
      title: rq.title,
      description: rq.description,
      estimatedMinutes: rq.estimatedMinutes,
      difficulty: rq.difficulty,
      xpReward: rq.difficulty * 100,
      avoidanceResolution: 'restructured',
    });
    setShowAntiAvoidance(false);
  };

  if (!quest) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner--lg" />
        <p className="text-muted">Loading quest...</p>
      </div>
    );
  }

  // ── XP Awarded Screen ──
  if (xpAwarded) {
    return (
      <div className="quest-detail__xp-screen" id="xp-awarded">
        <div className="quest-detail__xp-celebration">
          <div className="quest-detail__xp-burst animate-bounce-in">⚔️</div>
          <h2 className="h2 animate-fade-in-up delay-1">Quest Complete!</h2>
          <div className="quest-detail__xp-total animate-scale-in delay-2">
            +{xpAwarded.total} XP
          </div>
          <div className="quest-detail__xp-breakdown animate-fade-in-up delay-3">
            <div className="quest-detail__xp-row"><span>Base XP</span><span>+{xpAwarded.base}</span></div>
            {xpAwarded.onTimeBonus > 0 && <div className="quest-detail__xp-row"><span>⏰ On-Time Bonus</span><span className="text-success">+{xpAwarded.onTimeBonus}</span></div>}
            {xpAwarded.focusLockBonus > 0 && <div className="quest-detail__xp-row"><span>🔒 Focus Lock Bonus</span><span className="text-warning">+{xpAwarded.focusLockBonus}</span></div>}
            {xpAwarded.streakBonus > 0 && <div className="quest-detail__xp-row"><span>🔥 Streak Bonus</span><span className="text-danger">+{xpAwarded.streakBonus}</span></div>}
            {xpAwarded.proofBonus > 0 && <div className="quest-detail__xp-row"><span>📸 Proof Bonus</span><span className="text-cyan">+{xpAwarded.proofBonus}</span></div>}
            {xpAwarded.qualityBonus > 0 && <div className="quest-detail__xp-row"><span>✨ Quality Bonus</span><span className="text-gold">+{xpAwarded.qualityBonus}</span></div>}
          </div>
          <button className="btn btn--primary btn--lg btn--full delay-4 animate-fade-in-up" onClick={() => navigate('/dashboard')}>
            Return to Quests ⚔️
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quest-detail" id="quest-detail-page">
      {/* Header */}
      <div className="quest-detail__header animate-fade-in-up">
        <button className="quest-detail__back" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <span className={`badge ${quest.status === 'completed' ? 'badge--success' : quest.focusLocked ? 'badge--warning' : 'badge--purple'}`}>
          {quest.status === 'completed' ? '✅ Completed' : quest.focusLocked ? '🔒 Focus Locked' : '⚔️ Active'}
        </span>
      </div>

      {/* Title & Difficulty */}
      <div className="quest-detail__title-section animate-fade-in-up delay-1">
        <h1 className="h3">{quest.title}</h1>
        <div className="quest-detail__meta">
          <span className="difficulty-stars">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={`star ${i < quest.difficulty ? 'star--filled' : ''}`}>★</span>
            ))}
          </span>
          <span className="text-sm text-cyan font-semibold">+{quest.xpReward} XP</span>
          {quest.estimatedMinutes && <span className="text-sm text-tertiary">{quest.estimatedMinutes} min</span>}
        </div>
        <p className="text-sm text-muted" style={{ marginTop: '0.5rem' }}>{quest.description}</p>
        {/* Feature Badges */}
        <div className="flex mt-sm" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
          {quest.enableAIEvaluation && (
            <span className="badge badge--purple badge--sm">🤖 AI Evaluated</span>
          )}
          {quest.requireProof && (
            <span className="badge badge--warning badge--sm">📸 Proof Required</span>
          )}
        </div>
      </div>

      {/* Timer */}
      {quest.status !== 'completed' && quest.deadline && (
        <div className={`quest-detail__timer glass-card glass-card--no-hover animate-fade-in-up delay-2 ${timeRemaining === 'OVERDUE' ? 'quest-detail__timer--overdue' : ''}`}>
          <span className="quest-detail__timer-label">Time Remaining</span>
          <span className="quest-detail__timer-value">{timeRemaining}</span>
        </div>
      )}

      {/* Action Buttons */}
      {quest.status !== 'completed' && (
        <div className="quest-detail__actions animate-fade-in-up delay-3">
          {/* Focus Lock */}
          <button
            className={`quest-detail__action-btn ${quest.focusLocked ? 'quest-detail__action-btn--active-lock' : ''}`}
            onClick={() => setShowFocusLock(true)}
          >
            <span className="quest-detail__action-icon">{quest.focusLocked ? '🔓' : '🔒'}</span>
            <span className="quest-detail__action-label">
              {quest.focusLocked ? 'Unlock' : 'Focus Lock'}
            </span>
            <span className="quest-detail__action-desc">
              {quest.focusLocked ? 'Remove stakes' : '+50% XP • -25% if missed'}
            </span>
          </button>

          {/* Proof of Completion */}
          <button
            className={`quest-detail__action-btn ${quest.proofSubmitted ? 'quest-detail__action-btn--proof-done' : quest.requireProof ? 'quest-detail__action-btn--proof-required' : ''}`}
            onClick={() => setShowProofUpload(true)}
          >
            <span className="quest-detail__action-icon">{quest.proofSubmitted ? '✅' : quest.requireProof ? '⚠️' : '📸'}</span>
            <span className="quest-detail__action-label">
              {quest.proofSubmitted ? 'Proof Submitted' : quest.requireProof ? 'Submit Proof (Required)' : 'Submit Proof'}
            </span>
            <span className="quest-detail__action-desc">
              {quest.proofSubmitted
                ? `Quality: ${quest.proofData?.aiVerification?.qualityScore}/5`
                : quest.requireProof 
                  ? 'Mandatory — you must upload proof to complete' 
                  : 'Upload work for bonus XP'}
            </span>
          </button>

          {/* Upload Certificate */}
          <button
            className={`quest-detail__action-btn ${certResult?.isValid ? 'quest-detail__action-btn--proof-done' : ''}`}
            onClick={() => setShowCertUpload(true)}
          >
            <span className="quest-detail__action-icon">{certResult?.isValid ? '🏅' : '📜'}</span>
            <span className="quest-detail__action-label">
              {certResult?.isValid ? 'Certificate Verified' : 'Upload Certificate'}
            </span>
            <span className="quest-detail__action-desc">
              {certResult?.isValid
                ? `+${certCoins} coins earned!`
                : 'Upload event certificate for AI-scored bonus coins (1–500)'}
            </span>
          </button>

          {/* Blocked message when proof is required */}
          {quest.requireProof && !quest.proofSubmitted && (
            <p className="text-xs text-danger text-center" style={{ margin: '0.25rem 0' }}>
              ⚠️ Proof submission is mandatory for this challenge. You cannot complete it without uploading proof.
            </p>
          )}

          {/* Complete Challenge */}
          <button
            className="btn btn--success btn--lg btn--full"
            onClick={handleCompleteQuest}
            disabled={isProcessing || (quest.requireProof && !quest.proofSubmitted)}
            id="complete-quest-button"
          >
            {isProcessing ? <span className="spinner" /> : '✅ Complete Challenge'}
          </button>
        </div>
      )}

      {/* ── Focus Lock Modal ── */}
      {showFocusLock && (
        <>
          <div className="modal-backdrop" onClick={() => setShowFocusLock(false)} />
          <div className="modal">
            <div className="modal__handle" />
            <h3 className="h4 mb-base">
              {quest.focusLocked ? '🔓 Remove Focus Lock?' : '🔒 Activate Focus Lock?'}
            </h3>
            {!quest.focusLocked ? (
              <>
                <div className="quest-detail__lock-stakes glass-card glass-card--no-hover">
                  <div className="quest-detail__stake">
                    <span className="text-success font-bold">✅ Complete on time</span>
                    <span className="text-success">+50% XP bonus</span>
                  </div>
                  <div className="quest-detail__stake">
                    <span className="text-success font-bold">⚡ Complete early</span>
                    <span className="text-success">+75% XP bonus</span>
                  </div>
                  <div className="quest-detail__stake">
                    <span className="text-danger font-bold">❌ Miss deadline</span>
                    <span className="text-danger">-25% XP penalty</span>
                  </div>
                </div>
                <p className="text-sm text-muted mt-base">
                  Focus Lock creates real stakes. You bet on yourself — higher rewards if you deliver, real penalties if you don't.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">This will remove the Focus Lock and its bonus/penalty.</p>
            )}
            <div className="flex gap-base mt-lg">
              <button className="btn btn--secondary flex-1" onClick={() => setShowFocusLock(false)}>Cancel</button>
              <button className="btn btn--primary flex-1" onClick={handleFocusLock}>
                {quest.focusLocked ? 'Remove Lock' : '🔒 Lock In'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Proof Upload Modal ── */}
      {showProofUpload && (
        <>
          <div className="modal-backdrop" onClick={() => setShowProofUpload(false)} />
          <div className="modal">
            <div className="modal__handle" />
            <h3 className="h4 mb-base">📸 Proof of Completion</h3>
            <p className="text-sm text-muted mb-base">
              Upload your work and AI will verify it matches the challenge. Earn bonus XP for quality!
            </p>

            {!verificationResult ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <button
                  className="quest-detail__upload-zone"
                  onClick={() => fileInputRef.current?.click()}
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
                      <span>Tap to upload file</span>
                      <span className="text-xs text-tertiary">Images, PDFs, Docs</span>
                    </>
                  )}
                </button>
                <button
                  className={`btn btn--primary btn--full mt-base ${!proofFile ? 'onboarding__next-btn--disabled' : ''}`}
                  onClick={handleProofSubmit}
                  disabled={!proofFile || isProcessing}
                >
                  {isProcessing ? <><span className="spinner" /> AI Analyzing...</> : '🧠 Verify with AI'}
                </button>
              </>
            ) : (
              <div className="quest-detail__verification animate-fade-in-up">
                <div className={`quest-detail__verify-badge ${verificationResult.match ? 'quest-detail__verify-badge--match' : 'quest-detail__verify-badge--no-match'}`}>
                  {verificationResult.match ? '✅' : '❌'}
                </div>
                <h4 className="h5">{verificationResult.scoreLabel || (verificationResult.match ? 'Verified!' : 'Not Matched')}</h4>
                <p className="text-sm text-center mb-sm">{SCORE_LABELS[verificationResult.qualityScore]?.message}</p>
                <div className="quest-detail__quality-score">
                  <span className="text-sm text-muted">Quality Score</span>
                  <div className="quest-detail__quality-stars">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={`star ${i < verificationResult.qualityScore ? 'star--filled' : ''}`} style={{ fontSize: '1.25rem' }}>★</span>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted" style={{ textAlign: 'left' }}>
                  💬 {verificationResult.feedback}
                </p>
                {verificationResult.strengths?.length > 0 && (
                  <div className="quest-detail__eval-section">
                    <span className="text-xs text-success font-semibold">✅ Strengths</span>
                    {verificationResult.strengths.map((s, i) => (
                      <span key={i} className="text-xs text-muted">• {s}</span>
                    ))}
                  </div>
                )}
                {verificationResult.improvements?.length > 0 && (
                  <div className="quest-detail__eval-section">
                    <span className="text-xs text-warning font-semibold">💡 To improve</span>
                    {verificationResult.improvements.map((s, i) => (
                      <span key={i} className="text-xs text-muted">• {s}</span>
                    ))}
                  </div>
                )}
                {coinsEarned > 0 && (
                  <div className="quest-detail__coins-earned glass-card glass-card--no-hover">
                    <span>🪙</span>
                    <span className="font-bold text-gradient">+{coinsEarned} coins earned!</span>
                  </div>
                )}
                <button className="btn btn--primary btn--full mt-base" onClick={() => setShowProofUpload(false)}>
                  Done
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Anti-Avoidance Modal ── */}
      {showAntiAvoidance && avoidanceData && (
        <>
          <div className="modal-backdrop" onClick={() => setShowAntiAvoidance(false)} />
          <div className="modal">
            <div className="modal__handle" />
            <div className="quest-detail__avoidance-header">
              <span className="quest-detail__avoidance-icon">🧠</span>
              <h3 className="h4">Hesitation Detected</h3>
            </div>
            <p className="text-sm text-muted mb-base">Let's restore your momentum with the smallest next action. {avoidanceData.diagnosis}</p>
            <div className="glass-card glass-card--no-hover mb-base">
              <p className="text-sm font-semibold mb-sm">{avoidanceData.question}</p>
              {avoidanceData.options?.map((opt, idx) => (
                <button key={idx} className="quest-detail__avoidance-option">
                  <span>{opt.text}</span>
                  <span className="text-xs text-cyan">{opt.action}</span>
                </button>
              ))}
            </div>
            {avoidanceData.restructuredQuest && (
              <div className="glass-card glass-card--glow-cyan glass-card--no-hover mb-base">
                <p className="text-xs text-cyan font-semibold mb-sm">✨ RESTRUCTURED QUEST</p>
                <h4 className="h5">{avoidanceData.restructuredQuest.title}</h4>
                <p className="text-sm text-muted">{avoidanceData.restructuredQuest.description}</p>
                <div className="flex gap-base items-center mt-sm">
                  <span className="difficulty-stars">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={`star ${i < avoidanceData.restructuredQuest.difficulty ? 'star--filled' : ''}`}>★</span>
                    ))}
                  </span>
                  <span className="text-xs text-tertiary">{avoidanceData.restructuredQuest.estimatedMinutes}m</span>
                </div>
              </div>
            )}
            <p className="text-sm text-accent mb-base">{avoidanceData.motivationalMessage}</p>
            <div className="flex gap-base">
              <button className="btn btn--secondary flex-1" onClick={() => setShowAntiAvoidance(false)}>Keep Original</button>
              <button className="btn btn--primary flex-1" onClick={handleAcceptRestructure}>Accept Restructure</button>
            </div>
          </div>
        </>
      )}

      {/* ── Certificate Upload Modal ── */}
      {showCertUpload && (
        <>
          <div className="modal-backdrop" onClick={() => setShowCertUpload(false)} />
          <div className="modal">
            <div className="modal__handle" />
            <h3 className="h4 mb-sm">📜 Upload Certificate</h3>
            <p className="text-sm text-muted mb-base">
              Upload a certificate from any event (hackathon, course, workshop, competition) to earn bonus coins!
            </p>

            {!certResult ? (
              <>
                <div className="duel-wizard__field">
                  <label className="text-xs text-muted font-semibold">Event Description</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Won 2nd place at HackXYZ 2026"
                    value={certDescription}
                    onChange={(e) => setCertDescription(e.target.value)}
                  />
                </div>
                <input
                  ref={certInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleCertFileSelect}
                  style={{ display: 'none' }}
                />
                <button
                  className="quest-detail__upload-zone mb-base"
                  onClick={() => certInputRef.current?.click()}
                >
                  {certPreview ? (
                    <img src={certPreview} alt="Preview" className="quest-detail__proof-preview" />
                  ) : certFile ? (
                    <div className="quest-detail__file-info">
                      <span>📄</span>
                      <span>{certFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <span className="quest-detail__upload-icon">📜</span>
                      <span>Upload certificate</span>
                      <span className="text-xs text-tertiary">Images, PDFs</span>
                    </>
                  )}
                </button>
                <button
                  className={`btn btn--primary btn--full ${!certFile ? 'onboarding__next-btn--disabled' : ''}`}
                  onClick={handleCertSubmit}
                  disabled={!certFile || certProcessing}
                >
                  {certProcessing ? <><span className="spinner" /> Verifying...</> : '🧠 Verify Certificate'}
                </button>
              </>
            ) : (
              <div className="quest-detail__verification animate-fade-in-up">
                <div className={`quest-detail__verify-badge ${certResult.isValid ? 'quest-detail__verify-badge--match' : 'quest-detail__verify-badge--no-match'}`}>
                  {certResult.isValid ? '🏅' : '❌'}
                </div>
                <h4 className="h5">{certResult.isValid ? 'Certificate Verified!' : 'Could not verify'}</h4>
                <p className="text-sm text-muted">{certResult.summary}</p>
                {certResult.isValid && (
                  <>
                    <div className="quest-detail__cert-details">
                      <span className="text-xs text-muted">Event: {certResult.eventType}</span>
                      <span className="text-xs text-muted">Issuer: {certResult.issuer}</span>
                      <span className="text-xs text-muted">Significance: {'⭐'.repeat(certResult.significance)}</span>
                    </div>
                    <div className="quest-detail__coins-earned glass-card glass-card--no-hover">
                      <span>🪙</span>
                      <span className="font-bold text-gradient">+{certCoins} bonus coins earned!</span>
                    </div>
                  </>
                )}
                <button className="btn btn--primary btn--full mt-base" onClick={() => setShowCertUpload(false)}>
                  Done
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
