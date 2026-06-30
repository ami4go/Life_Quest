import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { decomposeGoal } from '../services/aiService';
import { getBaseXP } from '../utils/xpCalculator';
import './GoalIntakePage.css';

export default function GoalIntakePage() {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [goalText, setGoalText] = useState('');
  const [deadline, setDeadline] = useState('');
  const [phase, setPhase] = useState('input'); // input | mode_select | decomposing | preview | saving
  const [missionData, setMissionData] = useState({ missions: [] });
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Voice input
  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Voice input is not supported in this browser. Try Chrome.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join('');
      setGoalText(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleDecompose = async () => {
    if (!goalText.trim() || !deadline) return;
    setError(null);
    setPhase('decomposing');

    try {
      const result = await decomposeGoal(goalText, deadline, userData?.archetype);
      setMissionData(result || { missions: [] });
      setPhase('preview');
    } catch (err) {
      console.error(err);
      setError('AI is currently experiencing high demand or an error occurred. Please try again or build your quest manually.');
      setPhase('mode_select');
    }
  };

  const handleManualBuild = () => {
    setMissionData({
      missions: [{
        title: 'New Quest',
        description: 'Describe this phase of your goal',
        isBossBattle: false,
        quests: [{
          title: 'First Challenge',
          description: '',
          difficulty: 3,
          estimatedMinutes: 30,
        }]
      }]
    });
    setPhase('preview');
  };

  const handleSave = async () => {
    if (!missionData || !user || missionData.missions.length === 0) {
      setError('Please add at least one mission.');
      return;
    }
    setPhase('saving');

    try {
      for (const mission of missionData.missions) {
        // Create mission document
        const missionRef = await addDoc(collection(db, 'missions'), {
          userId: user.uid,
          goalText,
          title: mission.title || 'Untitled Mission',
          description: mission.description || '',
          deadline: Timestamp.fromDate(new Date(deadline)),
          status: 'active',
          progress: 0,
          isBossBattle: mission.isBossBattle || false,
          createdAt: Timestamp.now(),
          questIds: [],
        });

        // Create quests for this mission
        let order = 0;
        for (const quest of (mission.quests || [])) {
          await addDoc(collection(db, 'quests'), {
            userId: user.uid,
            missionId: missionRef.id,
            title: quest.title || 'Untitled Quest',
            description: quest.description || '',
            difficulty: quest.difficulty || 3,
            difficultyBreakdown: null,
            xpReward: getBaseXP(quest.difficulty || 3),
            status: 'pending',
            deadline: Timestamp.fromDate(new Date(deadline)),
            estimatedMinutes: quest.estimatedMinutes || 30,
            enableAIEvaluation: quest.enableAIEvaluation || false,
            requireProof: quest.requireProof || false,
            focusLocked: false,
            focusLockedAt: null,
            proofSubmitted: false,
            proofData: null,
            avoidanceCount: 0,
            avoidanceResolution: null,
            dependsOn: [],
            order: order++,
            completedAt: null,
            createdAt: Timestamp.now(),
          });
        }
      }

      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Failed to save. Please try again.');
      setPhase('preview');
    }
  };

  // ── Mission Data Editor Methods ──
  const removeMission = (mIdx) => {
    const updated = [...missionData.missions];
    updated.splice(mIdx, 1);
    setMissionData({ ...missionData, missions: updated });
  };

  const addMission = () => {
    setMissionData({
      ...missionData,
      missions: [...missionData.missions, { title: 'New Quest', description: '', quests: [] }]
    });
  };

  const updateMission = (mIdx, field, value) => {
    const updated = [...missionData.missions];
    updated[mIdx] = { ...updated[mIdx], [field]: value };
    setMissionData({ ...missionData, missions: updated });
  };

  const removeQuest = (mIdx, qIdx) => {
    const updatedMissions = [...missionData.missions];
    const updatedQuests = [...updatedMissions[mIdx].quests];
    updatedQuests.splice(qIdx, 1);
    updatedMissions[mIdx].quests = updatedQuests;
    setMissionData({ ...missionData, missions: updatedMissions });
  };

  const addQuest = (mIdx) => {
    const updatedMissions = [...missionData.missions];
    if (!updatedMissions[mIdx].quests) updatedMissions[mIdx].quests = [];
    updatedMissions[mIdx].quests.push({ title: 'New Challenge', difficulty: 3, estimatedMinutes: 30 });
    setMissionData({ ...missionData, missions: updatedMissions });
  };

  const updateQuest = (mIdx, qIdx, field, value) => {
    const updatedMissions = [...missionData.missions];
    const updatedQuests = [...updatedMissions[mIdx].quests];
    updatedQuests[qIdx] = { ...updatedQuests[qIdx], [field]: value };
    updatedMissions[mIdx].quests = updatedQuests;
    setMissionData({ ...missionData, missions: updatedMissions });
  };

  // ── Decomposing Phase ──
  if (phase === 'decomposing') {
    return (
      <div className="goal-intake" id="goal-decomposing">
        <div className="goal-intake__loading container">
          <div className="goal-intake__ai-orb animate-glow">
            <span className="goal-intake__ai-emoji">🧠</span>
          </div>
          <h2 className="h3 animate-fade-in">AI is analyzing your goal...</h2>
          <div className="goal-intake__steps">
            <div className="goal-intake__step animate-fade-in-up delay-1">📋 Parsing goal structure</div>
            <div className="goal-intake__step animate-fade-in-up delay-3">🗺️ Generating mission tree</div>
            <div className="goal-intake__step animate-fade-in-up delay-5">⚔️ Creating quests with difficulty scores</div>
            <div className="goal-intake__step animate-fade-in-up delay-7">🎯 Calibrating for your archetype</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Mode Select Phase ──
  if (phase === 'mode_select') {
    return (
      <div className="goal-intake" id="goal-mode-select">
        <div className="goal-intake__input container animate-fade-in-up">
          <h2 className="h3 text-center mb-lg">How do you want to build this?</h2>
          
          <div className="flex" style={{ gap: '1rem', flexDirection: 'column' }}>
            <button className="btn btn--primary btn--lg" onClick={handleDecompose}>
              🧠 Let AI Build It
            </button>
            <button className="btn btn--secondary btn--lg" onClick={handleManualBuild}>
              ✍️ Build Manually
            </button>
            <button className="btn btn--ghost mt-md" onClick={() => setPhase('input')}>
              ← Back
            </button>
          </div>
          {error && <p className="text-danger text-sm mt-md text-center">{error}</p>}
        </div>
      </div>
    );
  }

  // ── Preview Phase (Editable) ──
  if (phase === 'preview' && missionData) {
    return (
      <div className="goal-intake" id="goal-preview">
        <div className="goal-intake__preview container">
          <h2 className="h3 animate-fade-in-up">
            <span className="text-gradient">Your Quest Tree</span>
          </h2>
          <p className="text-sm text-muted animate-fade-in-up delay-1">
            Review and modify your challenges before accepting.
          </p>

          <div className="goal-intake__tree">
            {missionData.missions.map((mission, mIdx) => (
              <div key={mIdx} className="goal-intake__mission glass-card animate-fade-in-up" style={{ animationDelay: `${mIdx * 0.1}s` }}>
                
                {/* Mission Header Editable */}
                <div className="goal-intake__mission-header" style={{ position: 'relative' }}>
                  <button 
                    className="btn btn--icon text-danger" 
                    style={{ position: 'absolute', top: 0, right: 0 }}
                    onClick={() => removeMission(mIdx)}
                    title="Remove Quest Group"
                  >
                    ×
                  </button>
                  <span className="goal-intake__mission-icon">🗺️</span>
                  <div style={{ flex: 1, marginRight: '2rem' }}>
                    <input 
                      className="form-input text-bold h5 mb-xs" 
                      style={{ background: 'transparent', borderBottom: '1px solid var(--border-glass)', borderRadius: 0, padding: '4px 0' }}
                      value={mission.title}
                      onChange={(e) => updateMission(mIdx, 'title', e.target.value)}
                      placeholder="Quest Phase Title"
                    />
                    <input 
                      className="form-input text-xs text-muted"
                      style={{ background: 'transparent', borderBottom: '1px solid transparent', borderRadius: 0, padding: '4px 0' }}
                      value={mission.description || ''}
                      onChange={(e) => updateMission(mIdx, 'description', e.target.value)}
                      placeholder="Quest Phase Description"
                    />
                  </div>
                </div>

                {/* Quests Editable */}
                <div className="goal-intake__quests">
                  {(mission.quests || []).map((quest, qIdx) => (
                    <div key={qIdx} className="goal-intake__quest" style={{ alignItems: 'flex-start' }}>
                      <div className="goal-intake__quest-order">{qIdx + 1}</div>
                      <div className="goal-intake__quest-info" style={{ flex: 1 }}>
                        <div className="flex" style={{ gap: '0.5rem' }}>
                          <input 
                            className="form-input text-sm font-semibold"
                            style={{ flex: 1, padding: '0.25rem 0.5rem' }}
                            value={quest.title}
                            onChange={(e) => updateQuest(mIdx, qIdx, 'title', e.target.value)}
                            placeholder="Challenge Title"
                          />
                          <button 
                            className="btn btn--icon text-danger" 
                            onClick={() => removeQuest(mIdx, qIdx)}
                          >
                            🗑️
                          </button>
                        </div>
                        
                        <div className="goal-intake__quest-meta mt-xs flex align-center" style={{ gap: '1rem' }}>
                          <div className="flex align-center" style={{ gap: '0.25rem' }}>
                            <span className="text-xs">Diff (1-5):</span>
                            <input 
                              type="number" min="1" max="5" 
                              className="form-input text-xs" 
                              style={{ width: '50px', padding: '0.25rem' }}
                              value={quest.difficulty || 3}
                              onChange={(e) => updateQuest(mIdx, qIdx, 'difficulty', parseInt(e.target.value))}
                            />
                          </div>
                          <div className="flex align-center" style={{ gap: '0.25rem' }}>
                            <span className="text-xs">Mins:</span>
                            <input 
                              type="number" min="5" step="5"
                              className="form-input text-xs" 
                              style={{ width: '60px', padding: '0.25rem' }}
                              value={quest.estimatedMinutes || 30}
                              onChange={(e) => updateQuest(mIdx, qIdx, 'estimatedMinutes', parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                        <div className="flex mt-xs" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                          <label className="text-xs flex align-center" style={{ gap: '0.25rem', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={quest.enableAIEvaluation || false}
                              onChange={(e) => updateQuest(mIdx, qIdx, 'enableAIEvaluation', e.target.checked)}
                            />
                            🤖 AI Evaluation
                          </label>
                          <label className="text-xs flex align-center" style={{ gap: '0.25rem', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={quest.requireProof || false}
                              onChange={(e) => updateQuest(mIdx, qIdx, 'requireProof', e.target.checked)}
                            />
                            📸 Mandatory Proof
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    className="btn btn--ghost btn--sm mt-sm w-full"
                    onClick={() => addQuest(mIdx)}
                    style={{ border: '1px dashed var(--border-glass)' }}
                  >
                    + Add Custom Challenge
                  </button>
                </div>
              </div>
            ))}
            
            <button className="btn btn--secondary w-full mt-md" onClick={addMission}>
              + Add Another Quest Phase
            </button>
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <div className="goal-intake__actions mt-lg">
            <button
              className="btn btn--secondary"
              onClick={() => { setPhase('mode_select'); }}
            >
              ← Back
            </button>
            <button
              className="btn btn--primary"
              onClick={handleSave}
              id="save-missions-button"
              disabled={missionData.missions.length === 0}
            >
              {phase === 'saving' ? <span className="spinner" /> : 'Accept & Start ⚔️'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Input Phase ──
  return (
    <div className="goal-intake" id="goal-intake-page">
      <div className="goal-intake__input container">
        <button 
          className="btn btn--ghost btn--sm mb-md" 
          onClick={() => navigate('/dashboard')}
          style={{ alignSelf: 'flex-start', marginLeft: '-1rem' }}
        >
          ← Back to Dashboard
        </button>
        <div className="goal-intake__header animate-fade-in-up">
          <span className="goal-intake__icon">🎯</span>
          <h1 className="h2">
            What's your <span className="text-gradient">quest</span>?
          </h1>
          <p className="text-muted">
            Define your main goal and deadline.
          </p>
        </div>

        <div className="goal-intake__form animate-fade-in-up delay-2">
          <div className="goal-intake__textarea-wrap">
            <textarea
              className="goal-intake__textarea"
              placeholder='e.g. "Get a UX internship at Google by January"'
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              rows={4}
              id="goal-text-input"
            />
            <button
              className={`goal-intake__voice-btn ${isListening ? 'goal-intake__voice-btn--active' : ''}`}
              onClick={isListening ? stopVoiceInput : startVoiceInput}
              title="Voice input"
              id="voice-input-button"
            >
              {isListening ? '⏹️' : '🎤'}
            </button>
          </div>

          {isListening && (
            <div className="goal-intake__listening animate-fade-in">
              <span className="goal-intake__listening-dot" />
              Listening...
            </div>
          )}

          <div className="goal-intake__deadline-group">
            <label className="text-sm font-semibold">Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="goal-intake__date-input"
              id="deadline-input"
            />
          </div>

          <button
            className={`btn btn--primary btn--lg btn--full ${
              !goalText.trim() || !deadline ? 'onboarding__next-btn--disabled' : ''
            }`}
            onClick={() => setPhase('mode_select')}
            disabled={!goalText.trim() || !deadline}
          >
            Continue →
          </button>
        </div>

        {/* Example goals */}
        <div className="goal-intake__examples animate-fade-in-up delay-4">
          <p className="text-xs text-tertiary font-semibold mb-sm">EXAMPLE GOALS</p>
          {[
            'Complete my hackathon project by June 29',
            'Learn React and build a portfolio in 3 months',
            'Prepare for my final exams next month',
            'Launch my startup MVP by August',
          ].map((example, idx) => (
            <button
              key={idx}
              className="goal-intake__example"
              onClick={() => setGoalText(example)}
            >
              <span>→</span> {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
