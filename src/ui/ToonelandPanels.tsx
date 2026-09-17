import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { CHANNEL_MAP, CURRENCY, SERVICE } from '../config/toonelandConfig'
import { sound } from '../audio/soundManager'
import { useT } from '../i18n'

/** 투네랜드 최초 입장 시 이용 동의 (당첨왕 기획서 27p) */
export function ConsentModal() {
  const acceptConsent = useGameStore((s) => s.acceptConsent)
  const t = useT()
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t.consent.aria}>
      <div className="modal toon-modal">
        <div className="result-icon" aria-hidden>
          🌽
        </div>
        <h2>{t.consent.title}</h2>
        <p className="hint-text">{t.consent.lead}</p>
        <ol className="consent-list">
          {t.consent.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
        <div className="btn-row">
          {/* 거부 시 이전 페이지(투네랜드 메뉴)로 돌아갑니다 */}
          <button className="btn" onClick={() => window.history.back()}>
            {t.consent.back}
          </button>
          <button
            className="btn primary"
            autoFocus
            onClick={() => {
              sound.play('click')
              acceptConsent()
            }}
          >
            {t.consent.agree}
          </button>
        </div>
      </div>
    </div>
  )
}

/** 강냉이 부족 안내 · 충전 (럭키픽 기획서 12p / 당첨왕 27p) */
export function ChargeModal() {
  const closeOverlay = useGameStore((s) => s.closeOverlay)
  const chargeKernels = useGameStore((s) => s.chargeKernels)
  const channel = useGameStore((s) => s.channel)
  const chargeNeed = useGameStore((s) => s.chargeNeed)
  const t = useT()
  const need = chargeNeed || CHANNEL_MAP[channel].cost

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t.charge.aria}>
      <div className="modal toon-modal">
        <div className="result-icon" aria-hidden>
          💎
        </div>
        <h2>{t.charge.title}</h2>
        <p>{t.charge.body(need)}</p>
        <p className="hint-text">{t.charge.sub}</p>
        <div className="menu-list">
          <button
            className="btn primary"
            onClick={() => {
              sound.play('click')
              window.open(SERVICE.shopUrl, '_blank', 'noopener')
            }}
          >
            {t.charge.shop}
          </button>
          <button
            className="btn"
            onClick={() => {
              sound.play('coin')
              chargeKernels()
            }}
          >
            {t.charge.demo(CURRENCY.demoChargeKernels)}
          </button>
        </div>
        <p className="hint-text small">{t.charge.demoNote}</p>
        <button className="btn ghost" onClick={() => { sound.play('click'); closeOverlay() }}>
          {t.charge.cancel}
        </button>
      </div>
    </div>
  )
}

const PAGE_SIZE = 20

/** 게임참여내역 (당첨왕 기획서 13p) */
export function PlayHistoryPanel() {
  const playHistory = useGameStore((s) => s.playHistory)
  const closeOverlay = useGameStore((s) => s.closeOverlay)
  const t = useT()
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(playHistory.length / PAGE_SIZE))
  const cur = Math.min(page, totalPages - 1)
  const rows = playHistory.slice(cur * PAGE_SIZE, cur * PAGE_SIZE + PAGE_SIZE)

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t.playHistory.aria}>
      <div className="modal wide-modal">
        <h2>{t.playHistory.title}</h2>
        {rows.length === 0 ? (
          <p className="hint-text">{t.playHistory.empty}</p>
        ) : (
          <div className="table-scroll">
            <table className="toon-table">
              <thead>
                <tr>
                  <th>{t.playHistory.cols.time}</th>
                  <th>{t.playHistory.cols.type}</th>
                  <th>{t.playHistory.cols.spend}</th>
                  <th>{t.playHistory.cols.prize}</th>
                  <th>{t.playHistory.cols.result}</th>
                  <th>{t.playHistory.cols.kind}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id ?? r.at}>
                    <td>{new Date(r.at).toLocaleString('ko-KR')}</td>
                    <td>
                      {t.playHistory.gameName}
                      <small> ({CHANNEL_MAP[r.channel]?.name})</small>
                    </td>
                    <td className="minus">-{r.cost.toLocaleString()}</td>
                    <td className={r.payoutAmount ? 'plus' : ''}>{r.payoutLabel ?? '-'}</td>
                    <td>
                      <span className={`tag ${r.result}`}>{t.playHistory.results[r.result]}</span>
                    </td>
                    <td>{r.payoutType ? t.playHistory.kinds[r.payoutType] : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pager">
          <button className="btn" disabled={cur === 0} onClick={() => setPage(cur - 1)}>
            {t.playHistory.prev}
          </button>
          <span>{t.playHistory.page(cur + 1, totalPages)}</span>
          <button className="btn" disabled={cur >= totalPages - 1} onClick={() => setPage(cur + 1)}>
            {t.playHistory.next}
          </button>
        </div>
        <button className="btn primary" onClick={() => { sound.play('click'); closeOverlay() }}>
          {t.playHistory.back}
        </button>
      </div>
    </div>
  )
}

/** 인벤토리 — 당첨된 실물 · 기프티콘 상품 보관함 */
export function InventoryPanel() {
  const inventory = useGameStore((s) => s.inventory)
  const closeOverlay = useGameStore((s) => s.closeOverlay)
  const t = useT()

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t.inventory.aria}>
      <div className="modal wide-modal">
        <h2>{t.inventory.title}</h2>
        {inventory.length === 0 ? (
          <p className="hint-text">{t.inventory.empty}</p>
        ) : (
          <ul className="inventory-list">
            {inventory.map((item) => (
              <li key={item.id}>
                <span className="inv-icon" aria-hidden>
                  🎁
                </span>
                <span className="inv-name">{item.name}</span>
                <span className="inv-value">{t.inventory.value(item.kernelValue)}</span>
                <span className="inv-date">{new Date(item.at).toLocaleDateString('ko-KR')}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="hint-text small">{t.inventory.notice}</p>
        <button className="btn primary" onClick={() => { sound.play('click'); closeOverlay() }}>
          {t.inventory.back}
        </button>
      </div>
    </div>
  )
}
