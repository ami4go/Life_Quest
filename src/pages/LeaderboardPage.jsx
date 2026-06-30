import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getLevelInfo } from '../utils/levelSystem';
import { Crown, Medal, TrendingUp } from 'lucide-react';
import './LeaderboardPage.css';

const AVATAR_TINTS = [
  'linear-gradient(135deg, #22d3ee, #ec4899)',
  'linear-gradient(135deg, #ec4899, #fbbf24)',
  'linear-gradient(135deg, #fbbf24, #f59e0b)',
  'linear-gradient(135deg, #a855f7, #22d3ee)',
  'linear-gradient(135deg, #34d399, #22d3ee)',
];

function initial(name) {
  return (name || 'A').trim().charAt(0).toUpperCase();
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLeaderboard(); }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers = usersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.xp || 0) - (a.xp || 0))
        .slice(0, 50);
      setPlayers(allUsers);
    } catch (err) {
      console.error('Leaderboard load failed:', err);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner--lg" />
        <p className="text-muted">Loading leaderboard...</p>
      </div>
    );
  }

  const week = Math.ceil(((new Date()) - new Date(new Date().getFullYear(), 0, 1)) / 604800000);

  return (
    <div className="rank" id="leaderboard-page">
      <section className="rank__head">
        <p className="hud-eyebrow">Season 01 // Week {week}</p>
        <h1 className="screen-title">Global <span className="text-gradient-gold">Leaderboard</span></h1>
      </section>

      {/* Podium */}
      {players.length >= 3 && (
        <section className="rank__podium-wrap">
          <div className="hud-panel rank__podium">
            <PodiumCol player={players[1]} place={2} isMe={players[1]?.id === user?.uid} />
            <PodiumCol player={players[0]} place={1} isMe={players[0]?.id === user?.uid} />
            <PodiumCol player={players[2]} place={3} isMe={players[2]?.id === user?.uid} />
          </div>
        </section>
      )}

      {/* Ladder */}
      <section className="rank__ladder">
        <div className="section-head">
          <h2 className="section-head__title"><TrendingUp size={16} className="text-accent" /> Ladder</h2>
          <span className="section-head__action">Top 100</span>
        </div>
        <ul className="ladder-list">
          {players.slice(3).map((player, idx) => {
            const rank = idx + 4;
            const li = getLevelInfo(player.xp || 0);
            const isMe = player.id === user?.uid;
            return (
              <li key={player.id} className={`hud-panel ladder-row ${isMe ? 'ladder-row--me' : ''}`}>
                <span className="ladder-row__rank">#{rank}</span>
                <span className="ladder-row__avatar" style={{ background: AVATAR_TINTS[rank % AVATAR_TINTS.length] }}>
                  {initial(player.displayName)}
                </span>
                <div className="ladder-row__info">
                  <p className="ladder-row__name">
                    {player.displayName || 'Adventurer'}{isMe && <span className="ladder-row__you"> (You)</span>}
                  </p>
                  <p className="ladder-row__sub">{li.rank.title} · Lv.{li.level}</p>
                </div>
                <span className="ladder-row__xp">{(player.xp || 0).toLocaleString()} XP</span>
              </li>
            );
          })}
        </ul>
      </section>

      {players.length === 0 && (
        <div className="rank__empty">
          <span style={{ fontSize: '3rem' }}>🏆</span>
          <p className="text-muted">No players yet. Be the first!</p>
        </div>
      )}
    </div>
  );
}

function PodiumCol({ player, place, isMe }) {
  if (!player) return null;
  const li = getLevelInfo(player.xp || 0);
  const name = isMe ? `${player.displayName?.split(' ')[0] || 'You'} (You)` : (player.displayName?.split(' ')[0] || 'Anon');

  return (
    <div className={`podium-col podium-col--${place}`}>
      <div className="podium-col__top">
        {place === 1
          ? <Crown size={20} className="podium-col__crown" />
          : <Medal size={16} className={place === 2 ? 'text-muted' : 'text-gold'} />}
        <div
          className={`podium-col__avatar ${place === 1 ? 'podium-col__avatar--first' : ''}`}
          style={{ background: AVATAR_TINTS[place - 1] }}
        >
          {initial(player.displayName)}
        </div>
        <p className="podium-col__name">{name}</p>
        <p className="podium-col__xp">{(player.xp || 0).toLocaleString()} XP</p>
      </div>
      <div className={`podium-col__bar podium-col__bar--${place}`}>
        <span className="podium-col__place">{place}</span>
      </div>
    </div>
  );
}
