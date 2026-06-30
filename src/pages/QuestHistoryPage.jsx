import { useQuests } from '../contexts/QuestContext';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Trash2, ArrowLeft, Loader } from 'lucide-react';
import './DashboardPage.css';
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

export default function QuestHistoryPage() {
  const { missions, droppedQuests } = useQuests();
  const navigate = useNavigate();
  const [expandedGroup, setExpandedGroup] = useState(null);

  // Group all missions by goalText
  const groupedQuests = missions.reduce((acc, mission) => {
    const key = mission.goalText || 'Side Quests';
    if (!acc[key]) {
      acc[key] = {
        title: key,
        missions: [],
        totalXP: 0,
        doneMissions: 0,
        totalMissions: 0,
      };
    }
    acc[key].missions.push(mission);
    acc[key].totalMissions += 1;
    if (mission.status === 'completed') {
      acc[key].doneMissions += 1;
      // Approximate XP if not stored directly on mission, we can just use 100 as placeholder or mission's internal totalXP
      acc[key].totalXP += 500; 
    }
    return acc;
  }, {});

  const questGroups = Object.values(groupedQuests);
  
  // Categorize
  const completedGroups = questGroups.filter(g => g.totalMissions > 0 && g.doneMissions === g.totalMissions);
  const ongoingGroups = questGroups.filter(g => g.totalMissions > 0 && g.doneMissions > 0 && g.doneMissions < g.totalMissions);

  const toggleGroup = (title) => {
    setExpandedGroup((prev) => (prev === title ? null : title));
  };

  const renderGroup = (group, isCompletedSection = false) => (
    <li key={group.title} className={`quest-card hud-panel ${isCompletedSection ? 'quest-card--done' : ''}`} style={{ opacity: isCompletedSection ? 0.8 : 1 }}>
      <div className="quest-card__head" onClick={() => toggleGroup(group.title)} style={{ cursor: 'pointer' }}>
        <div className="quest-card__main">
          <h3 className="quest-card__title" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
            {isCompletedSection && '✅ '}{group.title}
          </h3>
          <p className="quest-card__meta">
            {group.doneMissions}/{group.totalMissions} missions completed
          </p>
        </div>
        <div className="quest-card__actions">
          <ChevronRight size={20} className={`quest-card__chev ${expandedGroup === group.title ? 'quest-card__chev--open' : ''}`} />
        </div>
      </div>

      <div className="quest-card__bar-row">
        <div className="quest-card__bar">
          <div className="quest-card__bar-fill rarity-fill--epic" style={{ width: `${Math.round((group.doneMissions / group.totalMissions) * 100)}%` }} />
        </div>
      </div>

      {expandedGroup === group.title && (
        <div className="quest-card__body">
          {group.missions.map((mission) => (
            <div key={mission.id} className="challenge-row">
              <div className="challenge-row__info">
                <span className={`challenge-row__title ${mission.status === 'completed' ? 'text-success' : 'text-muted'}`}>
                  {mission.status === 'completed' ? '✓ ' : '○ '}{mission.title || 'Untitled Mission'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </li>
  );

  return (
    <div className="quests" style={{ padding: '1rem', paddingBottom: '100px' }}>
      <div className="flex items-center gap-sm mb-lg">
        <button className="btn btn--ghost btn--sm" style={{ padding: '0.5rem', marginLeft: '-0.5rem' }} onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="h3" style={{ margin: 0, flex: 1, textShadow: '0 0 10px rgba(255,255,255,0.1)' }}>Quest History</h1>
      </div>

      {ongoingGroups.length > 0 && (
        <section className="quests__pad mb-lg">
          <div className="section-head">
            <h2 className="section-head__title">
              <Loader size={16} className="text-accent" /> Ongoing
              <span className="section-head__count">{ongoingGroups.length}</span>
            </h2>
          </div>
          <ul className="quest-list">
            {ongoingGroups.map(group => renderGroup(group, false))}
          </ul>
        </section>
      )}

      {completedGroups.length > 0 && (
        <section className="quests__pad mb-lg">
          <div className="section-head">
            <h2 className="section-head__title">
              <CheckCircle2 size={16} className="text-success" /> Completed
              <span className="section-head__count">{completedGroups.length}</span>
            </h2>
          </div>
          <ul className="quest-list">
            {completedGroups.map(group => renderGroup(group, true))}
          </ul>
        </section>
      )}

      {droppedQuests.length > 0 && (
        <section className="quests__pad">
          <div className="section-head">
            <h2 className="section-head__title">
              <Trash2 size={16} className="text-danger" /> Dropped / Skipped
              <span className="section-head__count">{droppedQuests.length}</span>
            </h2>
          </div>
          <ul className="quest-list">
            {droppedQuests.map((quest) => (
              <li key={quest.id} className="hud-panel dropped-item" style={{ opacity: 0.7 }}>
                <span className="dropped-item__title">{quest.title}</span>
                <span className="text-danger dropped-item__xp">Skipped/Dropped</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {completedGroups.length === 0 && ongoingGroups.length === 0 && droppedQuests.length === 0 && (
        <div className="quests__empty">
          <h3 className="h4">No history yet!</h3>
          <p className="text-muted text-sm">Completed, partially completed, or deleted quests will appear here.</p>
        </div>
      )}
    </div>
  );
}
