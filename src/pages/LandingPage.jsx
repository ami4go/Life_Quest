import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.png';
import './LandingPage.css';

export default function LandingPage() {
  const { loginWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/onboarding');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="landing" id="landing-page">
      {/* Animated background elements */}
      <div className="landing__bg-orbs">
        <div className="landing__orb landing__orb--1" />
        <div className="landing__orb landing__orb--2" />
        <div className="landing__orb landing__orb--3" />
      </div>

      {/* Floating particles */}
      <div className="landing__particles">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`landing__particle landing__particle--${i + 1}`} />
        ))}
      </div>

      <div className="landing__content container">
        {/* Logo */}
        <img src={logo} alt="LifeQuest AI" className="landing__logo animate-fade-in-scale" />

        {/* Hero badge */}
        <div className="landing__badge animate-fade-in-down">
          <span className="landing__badge-dot" />
          <span>AI-Powered Productivity</span>
        </div>

        {/* Main title */}
        <h1 className="landing__title animate-fade-in-up">
          <span className="text-gradient">LifeQuest</span>
          <span className="landing__title-sub">AI</span>
        </h1>

        {/* Tagline */}
        <p className="landing__tagline animate-fade-in-up delay-1">
          A Game Engine for Real-Life Goals
        </p>

        {/* Description */}
        <p className="landing__description animate-fade-in-up delay-2">
          Stop escaping into games to feel achievement.
          <br />
          <strong>Start achieving in reality.</strong>
        </p>

        {/* Feature pills */}
        <div className="landing__features animate-fade-in-up delay-3">
          <div className="landing__feature-pill">
            <span>⚔️</span> Quests & Missions
          </div>
          <div className="landing__feature-pill">
            <span>🧠</span> AI Anti-Avoidance
          </div>
          <div className="landing__feature-pill">
            <span>🔒</span> Focus Lock
          </div>
          <div className="landing__feature-pill">
            <span>📸</span> Proof of Work
          </div>
          <div className="landing__feature-pill">
            <span>🪙</span> Coins & Rewards
          </div>
          <div className="landing__feature-pill">
            <span>🏆</span> Rank & Badges
          </div>
        </div>

        {/* CTA */}
        <button
          className="btn btn--primary btn--lg landing__cta animate-fade-in-up delay-4"
          onClick={handleLogin}
          disabled={loading}
          id="login-button"
        >
          {loading ? (
            <span className="spinner" />
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p className="landing__subtitle animate-fade-in delay-5">
          Powered by <strong>Gemini AI</strong> • Free to use
        </p>

        {/* Stats */}
        <div className="landing__stats animate-fade-in-up delay-6">
          <div className="landing__stat">
            <span className="landing__stat-value text-gradient">5</span>
            <span className="landing__stat-label">Archetypes</span>
          </div>
          <div className="landing__stat-divider" />
          <div className="landing__stat">
            <span className="landing__stat-value text-gradient">∞</span>
            <span className="landing__stat-label">Quests</span>
          </div>
          <div className="landing__stat-divider" />
          <div className="landing__stat">
            <span className="landing__stat-value text-gradient">AI</span>
            <span className="landing__stat-label">Powered</span>
          </div>
        </div>
      </div>
    </div>
  );
}
