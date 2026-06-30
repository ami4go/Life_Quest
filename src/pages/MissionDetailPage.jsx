import { useParams, useNavigate } from 'react-router-dom';
import { useQuests } from '../contexts/QuestContext';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { calculateQuestXP } from '../utils/xpCalculator';
import { ArrowLeft, Trash2, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import './DashboardPage.css'; // Reuse styles

export default function MissionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { quests, missions, deleteMission, getDeletePenaltyInfo, updateUserData } = useQuests();
  const { userData, updateUserData: updateAuthData } = useAuth();
  const [deleteModal, setDeleteModal] = useState(null);
  const [xpAnimation, setXpAnimation] = useState(null);

  const mission = missions.find(m => m.id === id);
  const missionQuests = quests.filter(q => q.missionId === id).sort((a, b) => a.order - b.order);
  
  if (!mission) {
    return (
      <div className="loading-screen">
        <p className="text-muted">Quest not found...</p>
        <button className="btn btn--primary mt-base" onClick={() => navigate('/dashboard')}>Go Back</button>
      </div>
    );
  }

  const done = missionQuests.filter(q => q.status === 'completed').length;
  const total = missionQuests.length;
  const isComplete = total > 0 && done === total;

  const handleCompleteQuest = async (quest, e) => {
    e.stopPropagation();
    const now = new Date();
    const deadline = quest.deadline?.toDate ? quest.deadline.toDate() : new Date(quest.deadline || now);
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

    await updateDoc(doc(db, 'quests', quest.id), {
      status: 'completed',
      completedAt: Timestamp.now(),
    });

    const newXP = (userData?.xp || 0) + xpBreakdown.total;
    const newLevel = Math.floor(newXP / 1000);
    await updateAuthData({
      xp: newXP,
      level: newLevel,
      perfectStreak: (userData?.perfectStreak || 0) + 1,
      onTimeStreak: onTime ? (userData?.onTimeStreak || 0) + 1 : 0,
    });

    setXpAnimation({ xp: xpBreakdown.total, questId: quest.id });
    setTimeout(() => setXpAnimation(null), 2000);

    // Auto-complete mission check
    if (done + 1 === total) {
       // Mark mission as complete!
       // wait, in useQuests context, there is no explicit completeMission function, 
       // but we don't need one because Dashboard determines mission completion via `isComplete = done === total`.
       // Wait, no. Does the system need a mission document update?
       // Let's check if Missions have a status. Yes, status: 'active'.
       await updateDoc(doc(db, 'missions', mission.id), {
         status: 'completed',
         completedAt: Timestamp.now()
       });
       // Optional: Navigate back after a small delay
       setTimeout(() => {
         navigate('/dashboard');
       }, 2500);
    }
  };

  const handleDeleteClick = () => {
    const penaltyInfo = getDeletePenaltyInfo(mission.id);
    setDeleteModal({
      missionId: mission.id,
      title: mission.title || mission.goalText || 'Untitled Quest',
      penaltyInfo,
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    await deleteMission(deleteModal.missionId);
    setDeleteModal(null);
    navigate('/dashboard');
  };

  return (
    <div className="quest-detail" id="mission-detail-page" style={{ padding: '2rem 1.5rem', paddingBottom: '100px' }}>
      <div className="flex items-center gap-sm mb-lg">
        <button className="btn btn--ghost btn--sm" style={{ padding: '0.5rem', marginLeft: '-0.5rem' }} onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="h3" style={{ margin: 0, flex: 1, textShadow: '0 0 10px rgba(255,255,255,0.1)' }}>{mission.title || mission.goalText}</h1>
        <button className="quest-card__del" onClick={handleDeleteClick} style={{ background: 'rgba(255,0,0,0.1)' }}>
          <Trash2 size={18} className="text-danger" />
        </button>
      </div>

      <p className="text-sm text-muted mb-lg">{mission.description}</p>

      <div className="quest-card__bar-row mb-lg">
        <div className="quest-card__bar" style={{ height: '8px' }}>
          <div className="quest-card__bar-fill" style={{ width: `${total > 0 ? Math.round((done/total)*100) : 0}%`, background: 'var(--color-accent)' }} />
        </div>
        <span className="quest-card__pct">{total > 0 ? Math.round((done/total)*100) : 0}%</span>
      </div>

      <div className="section-head mb-sm">
        <h2 className="section-head__title">
           Challenges <span className="section-head__count">{done}/{total}</span>
        </h2>
      </div>

      <div className="quest-card__body" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '1rem', border: '1px solid var(--border-glass)' }}>
        {missionQuests.length === 0 ? (
           <p className="text-sm text-muted text-center py-base">No challenges found.</p>
        ) : (
          missionQuests.map((quest) => (
            <div
              key={quest.id}
              className={`challenge-row ${quest.status === 'completed' ? 'challenge-row--done' : ''}`}
              onClick={() => navigate(`/quest/${quest.id}`)}
              style={{ padding: '1rem', borderBottom: '1px solid var(--border-glass)' }}
            >
              {xpAnimation?.questId === quest.id && (
                <div className="challenge-row__xp-pop">+{xpAnimation.xp} XP ✨</div>
              )}
              {quest.status === 'completed' ? (
                <span className="challenge-row__check challenge-row__check--done">✓</span>
              ) : (
                <button className="challenge-row__check" onClick={(e) => handleCompleteQuest(quest, e)} title="Mark complete">○</button>
              )}
              <div className="challenge-row__info">
                <span className={`challenge-row__title ${quest.status === 'completed' ? 'challenge-row__title--done' : ''}`} style={{ fontSize: '1rem' }}>
                  {quest.focusLocked && '🔒 '}{quest.title}
                </span>
                <div className="challenge-row__sub">
                  <span className="difficulty-stars">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={`star ${i < quest.difficulty ? 'star--filled' : ''}`}>★</span>
                    ))}
                  </span>
                  <span className="text-accent text-xs">+{quest.xpReward} XP</span>
                  {quest.enableAIEvaluation && <span className="text-xs text-warning">🤖</span>}
                  {quest.requireProof && <span className="text-xs text-danger">📸</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isComplete && (
         <div className="glass-card mt-lg" style={{ textAlign: 'center', borderColor: 'var(--color-success)' }}>
            <CheckCircle2 size={32} className="text-success mb-sm" style={{ margin: '0 auto' }} />
            <h3 className="h4 text-success">Quest Completed!</h3>
            <p className="text-sm text-muted">All challenges are done. Returning to dashboard...</p>
         </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModal && (
        <>
          <div className="modal-backdrop" onClick={() => setDeleteModal(null)} />
          <div className="modal" style={{ zIndex: 1000 }}>
            <div className="modal__handle" />
            <h3 className="h4 mb-sm" style={{ color: 'var(--color-danger)' }}>⚠️ Delete Quest?</h3>
            <p className="text-sm text-muted mb-base">
              You are about to delete <strong>"{deleteModal.title}"</strong>. This cannot be undone.
            </p>
            <div className="glass-card glass-card--no-hover mb-base" style={{ padding: '1rem' }}>
              <p className="text-xs font-semibold text-muted mb-sm">PENALTIES FOR DELETION:</p>
              <div className="flex" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                <div className="flex items-center" style={{ gap: '0.35rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>💀</span>
                  <div>
                    <span className="text-danger font-bold">-{deleteModal.penaltyInfo.xpLoss} XP</span>
                    <div className="text-xs text-muted">{deleteModal.penaltyInfo.totalTasks} incomplete tasks × 50 XP</div>
                  </div>
                </div>
                <div className="flex items-center" style={{ gap: '0.35rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🪙</span>
                  <div>
                    <span className="text-warning font-bold">-{deleteModal.penaltyInfo.coinLoss} Coins</span>
                    <div className="text-xs text-muted">
                      {deleteModal.penaltyInfo.totalTasks} tasks × 10
                      {deleteModal.penaltyInfo.aiTaskCount > 0 && ` + ${deleteModal.penaltyInfo.aiTaskCount} AI tasks × 5`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-base">
              <button className="btn btn--secondary flex-1" onClick={() => setDeleteModal(null)}>Cancel</button>
              <button className="btn btn--danger flex-1" onClick={confirmDelete}>🗑️ Delete Anyway</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
