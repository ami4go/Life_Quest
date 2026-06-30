import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Palette, UserCog, Check, LogOut, ArrowLeft } from 'lucide-react';
import './SettingsPage.css';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { userData, updateUserData, logout } = useAuth();
  const { accent, setAccent, themes } = useTheme();
  const [name, setName] = useState(userData?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveProfile = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateUserData({ displayName: name.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Save profile failed:', err);
    }
    setSaving(false);
  };

  return (
    <div className="settings2" id="settings-page">
      <section className="settings2__head">
        <button className="settings2__back" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <h1 className="screen-title">Settings</h1>
      </section>

      {/* Theme / accent picker */}
      <section className="settings2__section">
        <div className="section-head">
          <h2 className="section-head__title"><Palette size={16} className="text-accent" /> Theme Accent</h2>
        </div>
        <div className="hud-panel settings2__card">
          <div className="accent-grid">
            {themes.map((t) => (
              <button
                key={t.id}
                className={`accent-swatch ${accent === t.id ? 'accent-swatch--active' : ''}`}
                onClick={() => setAccent(t.id)}
              >
                <span className="accent-swatch__dot" style={{ background: t.color }}>
                  {accent === t.id && <Check size={14} />}
                </span>
                <span className="accent-swatch__name">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Profile editing */}
      <section className="settings2__section">
        <div className="section-head">
          <h2 className="section-head__title"><UserCog size={16} className="text-accent" /> Profile</h2>
        </div>
        <div className="hud-panel settings2__card">
          <label className="settings2__label">Display name</label>
          <input
            className="input settings2__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <button className="btn btn--primary btn--full" onClick={saveProfile} disabled={saving || !name.trim()}>
            {saving ? <span className="spinner" /> : saved ? '✓ Saved' : 'Save changes'}
          </button>
        </div>
      </section>

      {/* Sign out */}
      <section className="settings2__section">
        <button className="hud-panel settings2__signout" onClick={logout}>
          <LogOut size={16} /><span>Sign out</span>
        </button>
      </section>
    </div>
  );
}
