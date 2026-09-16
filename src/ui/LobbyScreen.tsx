import { useGameStore } from '../store/gameStore'
import { useAdminStore } from '../store/adminStore'
import { CHANNELS, gradeOf, prizePayout, type ChannelKey } from '../config/toonelandConfig'
import { channelWinRate, sortedPrizes } from '../config/odds'
import { sound } from '../audio/soundManager'
import { useT } from '../i18n'

/** 채널 선택 화면 — 당첨왕의 채널 목록을 인형뽑기용으로 구성 */
export function LobbyScreen() {
  const kernels = useGameStore((s) => s.kernels)
  const dailyBonus = useGameStore((s) => s.dailyBonus)
  const enterChannel = useGameStore((s) => s.enterChannel)
  const openOverlay = useGameStore((s) => s.openOverlay)
  const openCharge = useGameStore((s) => s.openCharge)
  const odds = useAdminStore((s) => s.odds)
  const t = useT()
  const grade = gradeOf(kernels)
  const prizes = sortedPrizes(odds).filter((p) => p.visible)

  const pick = (key: ChannelKey, cost: number) => {
    sound.play('click')
    if (kernels < cost) {
      openCharge(cost)
      return
    }
    enterChannel(key)
  }

  return (
    <div className="lobby" role="dialog" aria-label={t.lobby.aria}>
      <div className="lobby-inner">
        <div className="lobby-head">
          <h1>
            {t.lobby.title}
            <small>{t.lobby.subtitle}</small>
          </h1>
          <div className="lobby-actions">
            <button className="btn" onClick={() => { sound.play('click'); openOverlay('playHistory') }}>
              🧾 {t.lobby.historyBtn}
            </button>
            <button className="btn" onClick={() => { sound.play('click'); openOverlay('inventory') }}>
              🎁 {t.lobby.inventoryBtn}
            </button>
          </div>
        </div>

        <ul className="lobby-notice">
          {t.lobby.notices.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>

        <section className="lobby-me">
          <span className="lobby-me-grade" style={{ color: grade.color }}>
            {grade.icon} {grade.name}
          </span>
          <span className="lobby-me-kernel">🌽 {kernels.toLocaleString()}</span>
          <span className="lobby-me-note">{t.toon.exchangeNote}</span>
        </section>

        {dailyBonus > 0 && (
          <p className="lobby-bonus" role="status">
            🎁 {t.hud.dailyBonus(dailyBonus)}
          </p>
        )}

        <h2 className="lobby-section-title">{t.lobby.prizes}</h2>
        <ul className="prize-strip">
          {prizes.map((p) => {
            const payout = prizePayout(p, 1000)
            return (
              <li key={p.key} className={`prize-item rank-${p.order}`}>
                <span className="prize-rank">{p.order}등</span>
                <span className="prize-name">{p.name}</span>
                <span className="prize-payout">
                  {p.payoutType === 'inventory' ? p.inventoryName : `${payout.label} 상당`}
                </span>
                <span className="prize-stock">
                  {p.stock === 0 ? t.lobby.prizeUnlimited : t.lobby.prizeStock(p.stock)}
                </span>
              </li>
            )
          })}
        </ul>

        <h2 className="lobby-section-title">{t.lobby.channels}</h2>
        <ul className="channel-list">
          {CHANNELS.map((c) => {
            const rate = channelWinRate(odds, c.key).toFixed(0)
            const enough = kernels >= c.cost
            return (
              <li key={c.key} className={`channel-card${enough ? '' : ' lack'}`}>
                <div className="channel-name">{c.name}</div>
                <div className="channel-cost">🌽 {c.cost.toLocaleString()}</div>
                <div className="channel-meta">
                  <span>{t.lobby.rate(rate)}</span>
                  <span>
                    {t.lobby.difficultyLabel} · {t.lobby.difficulty[c.difficulty]}
                  </span>
                  <span>{c.recommend}</span>
                </div>
                <button className="btn primary" onClick={() => pick(c.key, c.cost)}>
                  {enough ? t.lobby.enter : t.lobby.lack}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
