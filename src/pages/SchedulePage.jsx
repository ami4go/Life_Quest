import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuests } from '../contexts/QuestContext';
import { generateSchedule } from '../services/aiService';
import { getArchetypeTips } from '../utils/archetypeEngine';
import './SchedulePage.css';

export default function SchedulePage() {
  const { userData } = useAuth();
  const { activeQuests, todayQuests } = useQuests();
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const archetypeTips = userData?.archetype?.primary
    ? getArchetypeTips(userData.archetype.primary)
    : [];

  const handleGenerateSchedule = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateSchedule(
        activeQuests.slice(0, 10),
        userData?.archetype,
        new Date().toLocaleString()
      );
      setSchedule(result);
    } catch (err) {
      console.error(err);
      setError('Failed to generate schedule. Check your API key.');
    }
    setLoading(false);
  };

  return (
    <div className="schedule" id="schedule-page">
      <div className="schedule__header animate-fade-in-up">
        <h2 className="h3">
          <span className="text-gradient">AI Schedule</span>
        </h2>
        <p className="text-sm text-muted">
          Let AI plan your day based on your archetype and priorities
        </p>
      </div>

      {/* Quick Tips */}
      {archetypeTips.length > 0 && (
        <div className="schedule__tips glass-card glass-card--no-hover animate-fade-in-up delay-1">
          <h4 className="text-xs font-semibold text-muted mb-sm">
            💡 TIPS FOR YOUR ARCHETYPE
          </h4>
          {archetypeTips.map((tip, idx) => (
            <p key={idx} className="schedule__tip">
              <span className="schedule__tip-bullet">→</span> {tip}
            </p>
          ))}
        </div>
      )}

      {/* Generate Button */}
      {!schedule && (
        <button
          className="btn btn--primary btn--lg btn--full animate-fade-in-up delay-2"
          onClick={handleGenerateSchedule}
          disabled={loading || activeQuests.length === 0}
          id="generate-schedule-button"
        >
          {loading ? (
            <><span className="spinner" /> Generating...</>
          ) : activeQuests.length === 0 ? (
            'No active quests to schedule'
          ) : (
            '🧠 Generate Today\'s Schedule'
          )}
        </button>
      )}

      {error && <p className="text-danger text-sm animate-fade-in">{error}</p>}

      {/* Schedule Display */}
      {schedule && (
        <div className="schedule__content animate-fade-in-up">
          {/* Greeting */}
          <div className="schedule__greeting glass-card glass-card--glow-purple glass-card--no-hover">
            <p className="text-md">{schedule.greeting}</p>
            <p className="text-sm text-cyan font-semibold mt-sm">
              🎯 Top Priority: {schedule.topPriority}
            </p>
          </div>

          {/* Timeline */}
          <div className="schedule__timeline">
            {schedule.schedule?.map((item, idx) => (
              <div key={idx} className="schedule__item animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                <div className="schedule__item-time">
                  <span className="schedule__time-text">{item.time}</span>
                  <span className="schedule__duration">{item.duration}</span>
                </div>
                <div className="schedule__item-line">
                  <div className={`schedule__item-dot schedule__item-dot--${item.priority || 'normal'}`} />
                  <div className="schedule__item-connector" />
                </div>
                <div className="schedule__item-content glass-card glass-card--no-hover">
                  <h4 className="text-sm font-semibold">{item.title}</h4>
                  {item.tip && (
                    <p className="text-xs text-muted mt-xs">💡 {item.tip}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Archetype Tip */}
          {schedule.archetypeTip && (
            <div className="glass-card glass-card--no-hover">
              <p className="text-xs font-semibold text-muted mb-xs">🧬 ARCHETYPE INSIGHT</p>
              <p className="text-sm text-secondary">{schedule.archetypeTip}</p>
            </div>
          )}

          {/* Energy Advice */}
          {schedule.energyAdvice && (
            <div className="glass-card glass-card--no-hover">
              <p className="text-xs font-semibold text-muted mb-xs">⚡ ENERGY MANAGEMENT</p>
              <p className="text-sm text-secondary">{schedule.energyAdvice}</p>
            </div>
          )}

          {/* Regenerate */}
          <button
            className="btn btn--secondary btn--full"
            onClick={() => { setSchedule(null); }}
          >
            🔄 Regenerate Schedule
          </button>
        </div>
      )}
    </div>
  );
}
