import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ONBOARDING_QUESTIONS, ARCHETYPES } from '../utils/constants';
import { calculateArchetypeScores } from '../utils/archetypeEngine';
import './OnboardingPage.css';

export default function OnboardingPage() {
  const { updateUserData, userData } = useAuth();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [phase, setPhase] = useState('intro'); // intro | questions | analyzing | result
  const [archetypeResult, setArchetypeResult] = useState(null);
  const [animatingOut, setAnimatingOut] = useState(false);

  // Skip if already onboarded
  if (userData?.onboardingComplete) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const question = ONBOARDING_QUESTIONS[currentQuestion];
  const totalQuestions = ONBOARDING_QUESTIONS.length;
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  const handleStartQuiz = () => {
    setPhase('questions');
  };

  const handleSelectOption = (option) => {
    setSelectedOption(option);
  };

  const handleNext = async () => {
    if (!selectedOption) return;

    const newAnswers = [
      ...answers,
      { questionId: question.id, selectedOption },
    ];
    setAnswers(newAnswers);

    if (currentQuestion < totalQuestions - 1) {
      // Animate out then in
      setAnimatingOut(true);
      setTimeout(() => {
        setCurrentQuestion((prev) => prev + 1);
        setSelectedOption(null);
        setAnimatingOut(false);
      }, 300);
    } else {
      // Last question — analyze
      setPhase('analyzing');

      // Simulate AI analysis delay
      setTimeout(() => {
        const result = calculateArchetypeScores(newAnswers);
        setArchetypeResult(result);
        setPhase('result');
      }, 2500);
    }
  };

  const handleComplete = async () => {
    if (!archetypeResult) return;

    await updateUserData({
      archetype: {
        primary: archetypeResult.primary,
        secondary: archetypeResult.secondary,
        scores: archetypeResult.scores,
        detectedAt: new Date().toISOString(),
      },
      onboardingComplete: true,
    });

    navigate('/goals/new');
  };

  // ── Intro Phase ──
  if (phase === 'intro') {
    return (
      <div className="onboarding" id="onboarding-page">
        <div className="onboarding__intro container animate-fade-in-up">
          <div className="onboarding__intro-icon animate-float">🎯</div>
          <h1 className="h2">What goal worries you the most <span className="text-gradient">right now?</span></h1>
          <p className="text-muted">
            Everyone avoids work for different reasons. Answer 8 quick questions
            so our AI can predict your hesitation and personalize your LifeQuest experience.
          </p>
          <div className="onboarding__archetype-preview">
            {Object.values(ARCHETYPES).map((arch) => (
              <div key={arch.id} className="onboarding__archetype-chip">
                <span>{arch.emoji}</span>
                <span>{arch.name.replace('The ', '')}</span>
              </div>
            ))}
          </div>
          <button
            className="btn btn--primary btn--lg btn--full"
            onClick={handleStartQuiz}
            id="start-quiz-button"
          >
            Start Discovery →
          </button>
          <p className="text-xs text-tertiary" style={{ marginTop: '0.5rem' }}>
            Takes about 2 minutes
          </p>
        </div>
      </div>
    );
  }

  // ── Analyzing Phase ──
  if (phase === 'analyzing') {
    return (
      <div className="onboarding" id="onboarding-analyzing">
        <div className="onboarding__analyzing container">
          <div className="onboarding__analyzing-orb">
            <div className="spinner spinner--lg" />
          </div>
          <h2 className="h3 animate-fade-in">Analyzing your patterns...</h2>
          <div className="onboarding__analyzing-steps">
            <div className="onboarding__analyze-step animate-fade-in-up delay-1">
              ✅ Processing behavioral signals
            </div>
            <div className="onboarding__analyze-step animate-fade-in-up delay-3">
              ✅ Identifying avoidance patterns
            </div>
            <div className="onboarding__analyze-step animate-fade-in-up delay-5">
              🔄 Calibrating AI personality engine...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Result Phase ──
  if (phase === 'result' && archetypeResult) {
    const primary = archetypeResult.primaryInfo;
    const secondary = archetypeResult.secondaryInfo;

    return (
      <div className="onboarding" id="onboarding-result">
        <div className="onboarding__result container">
          <div className="onboarding__result-badge animate-bounce-in">
            <span className="onboarding__result-emoji">{primary.emoji}</span>
          </div>

          <h2 className="h3 animate-fade-in-up delay-1">You are</h2>
          <h1
            className="onboarding__result-name animate-fade-in-up delay-2"
            style={{ color: primary.color }}
          >
            {primary.name}
          </h1>
          <p className="text-muted animate-fade-in-up delay-3">
            {primary.description}
          </p>

          <div className="glass-card glass-card--no-hover animate-fade-in-up delay-4"
               style={{ marginTop: '1rem', width: '100%' }}>
            <p className="text-sm font-semibold mb-sm" style={{ color: primary.color }}>
              🛡️ Your LifeQuest Strategy
            </p>
            <p className="text-sm text-muted">{primary.fix}</p>
          </div>

          {secondary && (
            <div className="glass-card glass-card--no-hover animate-fade-in-up delay-5"
                 style={{ marginTop: '0.75rem', width: '100%' }}>
              <p className="text-sm font-semibold mb-sm">
                {secondary.emoji} Secondary: {secondary.name}
              </p>
              <p className="text-sm text-muted">{secondary.fix}</p>
            </div>
          )}

          {/* Score bars */}
          <div className="onboarding__scores animate-fade-in-up delay-6">
            {Object.entries(archetypeResult.scores)
              .sort(([, a], [, b]) => b - a)
              .map(([key, score]) => {
                const arch = ARCHETYPES[key];
                const maxScore = Math.max(...Object.values(archetypeResult.scores));
                const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
                return (
                  <div key={key} className="onboarding__score-row">
                    <span className="onboarding__score-label">
                      {arch.emoji} {arch.name.replace('The ', '')}
                    </span>
                    <div className="onboarding__score-bar">
                      <div
                        className="onboarding__score-fill"
                        style={{ width: `${pct}%`, background: arch.color }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          <button
            className="btn btn--primary btn--lg btn--full animate-fade-in-up delay-7"
            onClick={handleComplete}
            id="complete-onboarding-button"
            style={{ marginTop: '1.5rem' }}
          >
            Begin Your Quest ⚔️
          </button>
        </div>
      </div>
    );
  }

  // ── Question Phase ──
  return (
    <div className="onboarding" id="onboarding-questions">
      <div className="onboarding__questions container">
        {/* Progress */}
        <div className="onboarding__progress">
          <div className="onboarding__progress-bar">
            <div
              className="onboarding__progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="onboarding__progress-text">
            {currentQuestion + 1} / {totalQuestions}
          </span>
        </div>

        {/* Question */}
        <div
          className={`onboarding__question-card ${
            animatingOut ? 'onboarding__question-card--out' : 'animate-fade-in-up'
          }`}
          key={currentQuestion}
        >
          <span className="onboarding__question-number">
            Q{currentQuestion + 1}
          </span>
          <h2 className="onboarding__question-text">{question.question}</h2>
        </div>

        {/* Options */}
        <div className="onboarding__options">
          {question.options.map((option, idx) => (
            <button
              key={idx}
              className={`onboarding__option ${
                selectedOption === option ? 'onboarding__option--selected' : ''
              } ${animatingOut ? 'onboarding__option--out' : ''}`}
              onClick={() => handleSelectOption(option)}
              style={{ animationDelay: `${(idx + 1) * 0.08}s` }}
              id={`option-${idx}`}
            >
              <span className="onboarding__option-indicator">
                {selectedOption === option ? '◉' : '○'}
              </span>
              <span className="onboarding__option-text">{option.text}</span>
            </button>
          ))}
        </div>

        {/* Next button */}
        <button
          className={`btn btn--primary btn--full onboarding__next-btn ${
            !selectedOption ? 'onboarding__next-btn--disabled' : ''
          }`}
          onClick={handleNext}
          disabled={!selectedOption}
          id="next-question-button"
        >
          {currentQuestion === totalQuestions - 1 ? 'Reveal My Archetype ✨' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
