import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { spendCoins, getCoinHistory, getRedemptionHistory } from '../services/coinService';
import { pushNotification } from '../services/notificationService';
import { STORE_ITEMS, NOTIF_TYPES } from '../utils/constants';
import { Coins, TrendingUp, TrendingDown, Wallet, Gift, History } from 'lucide-react';
import './RewardsPage.css';

export default function RewardsPage() {
  const { user, userData, updateUserData } = useAuth();
  const [coinHistory, setCoinHistory] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(null);
  const [showSuccess, setShowSuccess] = useState(null);
  const [processing, setProcessing] = useState(false);

  const coins = userData?.coins || 0;
  const totalEarned = userData?.totalCoinsEarned || 0;
  const totalSpent = coinHistory
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  useEffect(() => { if (user) loadHistory(); }, [user]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const [history, orders] = await Promise.all([
        getCoinHistory(user.uid),
        getRedemptionHistory(user.uid),
      ]);
      setCoinHistory(history);
      setRedemptions(orders);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
    setLoading(false);
  };

  const handleRedeem = async (item) => {
    setProcessing(true);
    try {
      const result = await spendCoins(user.uid, item.price, item.id, item.name);
      await updateUserData({ coins: result.newBalance });
      await pushNotification(user.uid, {
        type: NOTIF_TYPES.COINS,
        title: `${item.emoji} Redeemed ${item.name}`,
        body: `-${item.price} coins. Your order is pending fulfilment.`,
        icon: '🎁',
      });
      setShowConfirm(null);
      setShowSuccess(item);
      await loadHistory();
      setTimeout(() => setShowSuccess(null), 3000);
    } catch (err) {
      console.error('Redemption failed:', err);
      alert(err.message);
    }
    setProcessing(false);
  };

  return (
    <div className="rewards-page" id="rewards-page">
      <section className="rewards2__head">
        <p className="hud-eyebrow">Treasury</p>
        <h1 className="screen-title">Redeem <span className="text-gradient-gold">Coins</span></h1>
      </section>

      {/* Top three counts */}
      <div className="rewards2__counts">
        <div className="hud-panel rewards2__count">
          <TrendingUp size={16} className="text-success" />
          <div className="rewards2__count-val">{totalEarned.toLocaleString()}</div>
          <div className="rewards2__count-label">Total Earned</div>
        </div>
        <div className="hud-panel rewards2__count">
          <TrendingDown size={16} className="text-danger" />
          <div className="rewards2__count-val">{totalSpent.toLocaleString()}</div>
          <div className="rewards2__count-label">Total Spent</div>
        </div>
        <div className="hud-panel rewards2__count">
          <Wallet size={16} className="text-gold" />
          <div className="rewards2__count-val">{coins.toLocaleString()}</div>
          <div className="rewards2__count-label">Remaining</div>
        </div>
      </div>

      {/* Redeem Coins — merch */}
      <section className="rewards2__section">
        <div className="section-head">
          <h2 className="section-head__title"><Gift size={16} className="text-accent" /> Redeem Coins</h2>
        </div>
        <div className="rewards2__store">
          {STORE_ITEMS.map((item) => {
            const canAfford = coins >= item.price;
            return (
              <div key={item.id} className={`hud-panel rewards2__item ${!canAfford ? 'rewards2__item--locked' : ''}`}>
                <div className="rewards2__item-emoji">{item.emoji}</div>
                <h4 className="rewards2__item-name">{item.name}</h4>
                <p className="rewards2__item-desc">{item.description}</p>
                <div className="rewards2__item-price">
                  <Coins size={14} className="text-gold" />
                  <span className={canAfford ? 'text-gold' : 'text-muted'}>{item.price.toLocaleString()}</span>
                </div>
                <button
                  className={`btn btn--sm btn--full ${canAfford ? 'btn--primary' : 'btn--secondary'}`}
                  disabled={!canAfford}
                  onClick={() => setShowConfirm(item)}
                >
                  {canAfford ? 'Redeem' : `Need ${(item.price - coins).toLocaleString()} more`}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* History */}
      <section className="rewards2__section">
        <div className="section-head">
          <h2 className="section-head__title"><History size={16} className="text-accent" /> Coin History</h2>
        </div>
        {loading ? (
          <div className="loading-screen" style={{ padding: '2rem', minHeight: 'auto' }}>
            <div className="spinner spinner--lg" />
          </div>
        ) : coinHistory.length === 0 ? (
          <div className="rewards2__empty hud-panel">
            <span style={{ fontSize: '2rem' }}>🪙</span>
            <p className="text-sm text-muted">No transactions yet. Complete AI-evaluated tasks and duels to earn coins!</p>
          </div>
        ) : (
          <ul className="rewards2__history">
            {coinHistory.map((tx) => (
              <li key={tx.id} className="hud-panel rewards2__tx">
                <span className="rewards2__tx-dot" data-kind={tx.amount > 0 ? 'earn' : 'spend'}>
                  {tx.amount > 0 ? '＋' : '－'}
                </span>
                <div className="rewards2__tx-info">
                  <span className="rewards2__tx-reason">{tx.reason}</span>
                  <span className="rewards2__tx-date">
                    {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString() : ''}
                    {tx.score ? ` · Score ${tx.score}/5` : ''}
                  </span>
                </div>
                <span className={`rewards2__tx-amt ${tx.amount > 0 ? 'text-success' : 'text-danger'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </span>
              </li>
            ))}
          </ul>
        )}

        {redemptions.length > 0 && (
          <>
            <div className="section-head" style={{ marginTop: '1.25rem' }}>
              <h2 className="section-head__title"><Gift size={16} className="text-magenta" /> Redemption Orders</h2>
            </div>
            <ul className="rewards2__history">
              {redemptions.map((order) => (
                <li key={order.id} className="hud-panel rewards2__tx">
                  <div className="rewards2__tx-info">
                    <span className="rewards2__tx-reason">{order.itemName}</span>
                    <span className="rewards2__tx-date">
                      {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : ''}
                    </span>
                  </div>
                  <span className={`badge ${order.status === 'shipped' ? 'badge--success' : 'badge--warning'}`}>
                    {order.status === 'shipped' ? '📦 Shipped' : '⏳ Pending'}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Confirm modal */}
      {showConfirm && (
        <>
          <div className="modal-backdrop" onClick={() => setShowConfirm(null)} />
          <div className="modal">
            <div className="modal__handle" />
            <div className="rewards__confirm">
              <span className="rewards__confirm-emoji">{showConfirm.emoji}</span>
              <h3 className="h4">Redeem {showConfirm.name}?</h3>
              <p className="text-sm text-muted mb-base">{showConfirm.description}</p>
              <div className="rewards__confirm-cost glass-card glass-card--no-hover">
                <span>🪙 Cost</span>
                <span className="text-gradient font-bold">{showConfirm.price.toLocaleString()}</span>
              </div>
              <div className="rewards__confirm-balance">
                <span className="text-xs text-muted">Remaining balance:</span>
                <span className="text-sm font-bold">{(coins - showConfirm.price).toLocaleString()} coins</span>
              </div>
              <div className="flex gap-base mt-lg">
                <button className="btn btn--secondary flex-1" onClick={() => setShowConfirm(null)}>Cancel</button>
                <button className="btn btn--primary flex-1" onClick={() => handleRedeem(showConfirm)} disabled={processing}>
                  {processing ? <span className="spinner" /> : '🪙 Confirm'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showSuccess && (
        <div className="rewards__success-toast animate-bounce-in">
          <span>{showSuccess.emoji}</span>
          <span>🎉 {showSuccess.name} redeemed!</span>
        </div>
      )}
    </div>
  );
}
