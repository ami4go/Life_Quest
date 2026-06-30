import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Bell, Coins, Menu, Target, Swords, Trophy, User, Plus,
  Award, Gift, Settings, LogOut, X, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { getLevelInfo } from '../../utils/levelSystem';
import { XP_PER_LEVEL } from '../../utils/constants';
import logo from '../../assets/logo.png';
import './MobileShell.css';

const TABS = [
  { to: '/dashboard', icon: Target, label: 'Quests' },
  { to: '/duels', icon: Swords, label: 'Duels' },
  { to: '/leaderboard', icon: Trophy, label: 'Rank' },
  { to: '/profile', icon: User, label: 'Profile' },
];

const MENU = [
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/history', icon: CheckCircle2, label: 'Quest History' },
  { to: '/duels', icon: Swords, label: 'Duels' },
  { to: '/leaderboard', icon: Trophy, label: 'Rank / Leaderboard' },
  { to: '/badges', icon: Award, label: 'Badges' },
  { to: '/rewards', icon: Gift, label: 'Rewards' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function timeAgo(ts) {
  const d = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : null);
  if (!d) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function TopHud({ onMenu, onBell, unread }) {
  const { userData } = useAuth();
  const levelInfo = getLevelInfo(userData?.xp || 0);
  const pct = Math.min(100, levelInfo.progress);

  return (
    <header className="hud">
      <button aria-label="Menu" className="hud__icon-btn hud-panel" onClick={onMenu}>
        <Menu size={20} />
      </button>

      <div className="hud__level">
        <div className="hud__level-row">
          <span className="hud__level-badge">{levelInfo.level}</span>
          <span className="hud__rank">{levelInfo.rank.title}</span>
          <span className="hud__xp-count">{levelInfo.xpInLevel}/{XP_PER_LEVEL}</span>
        </div>
        <div className="hud__bar">
          <div className="hud__bar-fill shimmer-bar" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="hud__coins hud-panel">
        <Coins size={16} className="text-gold" />
        <span className="hud__coins-val">{(userData?.coins || 0).toLocaleString()}</span>
      </div>

      <button aria-label="Notifications" className="hud__icon-btn hud-panel hud__bell" onClick={onBell}>
        <Bell size={16} />
        {unread > 0 && <span className="hud__bell-dot animate-pulse-glow" />}
      </button>
    </header>
  );
}

function SideMenu({ open, onClose }) {
  const navigate = useNavigate();
  const { user, userData, logout } = useAuth();
  const levelInfo = getLevelInfo(userData?.xp || 0);
  const go = (to) => { onClose(); navigate(to); };

  return (
    <>
      <div className={`drawer-backdrop ${open ? 'drawer-backdrop--open' : ''}`} onClick={onClose} />
      <aside className={`sidemenu ${open ? 'sidemenu--open' : ''}`}>
        <div className="sidemenu__head">
          <button className="sidemenu__close" onClick={onClose} aria-label="Close menu"><X size={18} /></button>
          <div className="sidemenu__brand">
            <img src={logo} alt="" className="sidemenu__brand-logo" />
            <span className="sidemenu__brand-text text-gradient">LifeQuest AI</span>
          </div>
          <div className="sidemenu__avatar">
            {userData?.photoURL
              ? <img src={userData.photoURL} alt="" />
              : (userData?.displayName || 'A').charAt(0).toUpperCase()}
          </div>
          <p className="sidemenu__name">{userData?.displayName || 'Adventurer'}</p>
          <p className="sidemenu__sub">{levelInfo.rank.title} · Lv.{levelInfo.level} · {(userData?.coins || 0)} 🪙</p>
        </div>

        <nav className="sidemenu__nav">
          {MENU.map((m) => (
            <button key={m.to} className="sidemenu__item" onClick={() => go(m.to)}>
              <m.icon size={18} /><span>{m.label}</span>
            </button>
          ))}
        </nav>

        <button className="sidemenu__signout" onClick={async () => { onClose(); await logout(); }}>
          <LogOut size={18} /><span>Sign out</span>
        </button>
      </aside>
    </>
  );
}

function NotificationPanel({ open, onClose }) {
  const { notifications } = useNotifications();
  return (
    <>
      <div className={`drawer-backdrop ${open ? 'drawer-backdrop--open' : ''}`} onClick={onClose} />
      <aside className={`notif-panel ${open ? 'notif-panel--open' : ''}`}>
        <div className="notif-panel__head">
          <h3>Reality Feed</h3>
          <button className="sidemenu__close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="notif-panel__list">
          {notifications.length === 0 ? (
            <div className="notif-panel__empty">
              <Bell size={28} className="text-muted" />
              <p className="text-muted text-sm">No momentum recorded yet. Quests, duels and rewards will show up here.</p>
            </div>
          ) : notifications.map((n) => (
            <div key={n.id} className={`notif-item ${!n.read ? 'notif-item--unread' : ''}`}>
              <span className="notif-item__icon">{n.icon || '🔔'}</span>
              <div className="notif-item__body">
                <p className="notif-item__title">{n.title}</p>
                {n.body && <p className="notif-item__text">{n.body}</p>}
                <span className="notif-item__time">{timeAgo(n.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

export default function MobileShell({ children }) {
  const navigate = useNavigate();
  const { unreadCount, markAllRead } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const openNotif = () => { setNotifOpen(true); markAllRead(); };

  return (
    <div className="shell">
      <div aria-hidden className="shell__scanline scanline" />
      <TopHud onMenu={() => setMenuOpen(true)} onBell={openNotif} unread={unreadCount} />

      <main className="shell__main">{children}</main>

      <nav className="tabbar">
        <div className="tabbar__panel hud-panel">
          <ul className="tabbar__list">
            {TABS.slice(0, 2).map((t) => <TabItem key={t.to} {...t} />)}
            <li className="tabbar__fab-wrap">
              <button aria-label="New quest" className="tabbar__fab glow-cyan" onClick={() => navigate('/goals/new')}>
                <Plus size={28} strokeWidth={2.5} />
              </button>
            </li>
            {TABS.slice(2).map((t) => <TabItem key={t.to} {...t} />)}
          </ul>
        </div>
      </nav>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}

function TabItem({ to, icon: Icon, label }) {
  return (
    <li className="tabbar__item">
      <NavLink to={to} className={({ isActive }) => `tabbar__link ${isActive ? 'tabbar__link--active' : ''}`}>
        <Icon size={20} />
        <span>{label}</span>
      </NavLink>
    </li>
  );
}
