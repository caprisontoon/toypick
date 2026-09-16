import { useMemo, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { useAdminStore } from '../store/adminStore'
import { DEFAULT_ODDS, channelWinRate, type OddsConfig } from '../config/odds'
import { CHANNELS, DEFAULT_PRIZES, type PayoutType, type PrizeConfig } from '../config/toonelandConfig'
import { sound } from '../audio/soundManager'
import { useT } from '../i18n'

type Tab = 'odds' | 'prizes' | 'stats' | 'logs'

function toLocalInput(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function downloadCsv(name: string, rows: (string | number)[][]): void {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
  // 엑셀에서 한글이 깨지지 않도록 BOM 추가
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 관리자 페이지
 * 럭키픽 관리자(확률 설정 · 도전 통계 · 상품 통계)를 인형뽑기에 맞춰 옮긴 로컬 화면입니다.
 */
export function AdminPanel() {
  const closeOverlay = useGameStore((s) => s.closeOverlay)
  const odds = useAdminStore((s) => s.odds)
  const reserved = useAdminStore((s) => s.reserved)
  const logs = useAdminStore((s) => s.logs)
  const stats = useAdminStore((s) => s.stats)
  const saveOdds = useAdminStore((s) => s.saveOdds)
  const cancelReserved = useAdminStore((s) => s.cancelReserved)
  const resetStats = useAdminStore((s) => s.resetStats)
  const t = useT()

  const [tab, setTab] = useState<Tab>('odds')
  const [draft, setDraft] = useState<OddsConfig>(odds)
  const [mode, setMode] = useState<'now' | 'reserved'>('now')
  const [at, setAt] = useState(() => toLocalInput(Date.now() + 60 * 60 * 1000))
  const [toast, setToast] = useState('')

  const flash = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2600)
  }

  const setNum = (key: keyof OddsConfig, value: string) =>
    setDraft((d) => ({ ...d, [key]: Number(value) }))

  const totalWeight = useMemo(
    () => draft.prizes.filter((p) => p.visible).reduce((s, p) => s + p.weight, 0),
    [draft.prizes],
  )

  const saveOddsForm = () => {
    const ok =
      draft.minWinRate >= 0 &&
      draft.maxWinRate <= 100 &&
      draft.minWinRate <= draft.maxWinRate &&
      draft.baseWinRate >= 0 &&
      draft.baseWinRate <= 100 &&
      draft.aimWeight >= 0 &&
      draft.aimWeight <= 100 &&
      draft.cashbackPercent >= 0 &&
      draft.cashbackPercent <= 100 &&
      draft.catchAssist >= 20 &&
      draft.catchAssist <= 300
    if (!ok) {
      flash(t.admin.odds.invalid)
      return
    }
    sound.play('click')
    saveOdds(draft, mode, mode === 'reserved' ? new Date(at).getTime() : undefined)
    flash(t.admin.odds.saved)
  }

  const updatePrize = (key: string, patch: Partial<PrizeConfig>) =>
    setDraft((d) => ({ ...d, prizes: d.prizes.map((p) => (p.key === key ? { ...p, ...patch } : p)) }))

  const savePrizes = () => {
    sound.play('click')
    saveOdds(draft, 'now')
    flash(t.admin.prizes.saved)
  }

  return (
    <div className="modal-backdrop admin-backdrop" role="dialog" aria-modal="true" aria-label={t.admin.title}>
      <div className="admin-panel">
        <header className="admin-head">
          <h2>{t.admin.title}</h2>
          <button className="btn ghost" onClick={() => { sound.play('click'); closeOverlay() }}>
            {t.admin.close}
          </button>
        </header>
        <p className="hint-text small">{t.admin.demoNote}</p>

        <nav className="admin-tabs">
          {(['odds', 'prizes', 'stats', 'logs'] as Tab[]).map((k) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {t.admin.tabs[k]}
            </button>
          ))}
        </nav>

        <div className="admin-body">
          {tab === 'odds' && (
            <section className="admin-form">
              {reserved && (
                <p className="admin-reserved">
                  {t.admin.odds.reservedInfo(new Date(reserved.at).toLocaleString('ko-KR'))}
                  <button className="btn ghost" onClick={() => { sound.play('click'); cancelReserved() }}>
                    {t.admin.odds.cancelReserved}
                  </button>
                </p>
              )}

              <label>
                <span>{t.admin.odds.base}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={draft.baseWinRate}
                  onChange={(e) => setNum('baseWinRate', e.target.value)}
                />
                <small>{t.admin.odds.baseHint}</small>
              </label>

              <div className="admin-row">
                <label>
                  <span>{t.admin.odds.max}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.maxWinRate}
                    onChange={(e) => setNum('maxWinRate', e.target.value)}
                  />
                </label>
                <label>
                  <span>{t.admin.odds.min}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.minWinRate}
                    onChange={(e) => setNum('minWinRate', e.target.value)}
                  />
                </label>
              </div>

              <div className="admin-row">
                <label>
                  <span>{t.admin.odds.aim}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.aimWeight}
                    onChange={(e) => setNum('aimWeight', e.target.value)}
                  />
                  <small>{t.admin.odds.aimHint}</small>
                </label>
                <label>
                  <span>{t.admin.odds.catchAssist}</span>
                  <input
                    type="number"
                    min={20}
                    max={300}
                    value={draft.catchAssist}
                    onChange={(e) => setNum('catchAssist', e.target.value)}
                  />
                  <small>{t.admin.odds.catchAssistHint}</small>
                </label>
              </div>

              <div className="admin-row">
                <label>
                  <span>{t.admin.odds.cashback}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.cashbackPercent}
                    onChange={(e) => setNum('cashbackPercent', e.target.value)}
                  />
                  <small>{t.admin.odds.cashbackHint}</small>
                </label>
                <label>
                  <span>{t.admin.odds.pity}</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={draft.pityAfter}
                    onChange={(e) => setNum('pityAfter', e.target.value)}
                  />
                  <small>{t.admin.odds.pityHint}</small>
                </label>
              </div>

              <fieldset className="admin-fieldset">
                <legend>{t.admin.odds.channelFactor}</legend>
                <div className="admin-grid">
                  {CHANNELS.map((c) => (
                    <label key={c.key}>
                      <span>{c.name}</span>
                      <input
                        type="number"
                        step={0.05}
                        min={0}
                        max={5}
                        value={draft.channelFactor[c.key]}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            channelFactor: { ...d.channelFactor, [c.key]: Number(e.target.value) },
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="admin-fieldset">
                <legend>{t.admin.odds.preview}</legend>
                <ul className="admin-preview">
                  {CHANNELS.map((c) => (
                    <li key={c.key}>
                      {t.admin.odds.previewRow(c.name, channelWinRate(draft, c.key).toFixed(1))}
                    </li>
                  ))}
                </ul>
              </fieldset>

              <fieldset className="admin-fieldset">
                <legend>{t.admin.odds.applyMode}</legend>
                <div className="admin-apply">
                  <label className="inline">
                    <input type="radio" checked={mode === 'now'} onChange={() => setMode('now')} />
                    {t.admin.odds.now}
                  </label>
                  <label className="inline">
                    <input
                      type="radio"
                      checked={mode === 'reserved'}
                      onChange={() => setMode('reserved')}
                    />
                    {t.admin.odds.reserved}
                  </label>
                  <input
                    type="datetime-local"
                    value={at}
                    disabled={mode !== 'reserved'}
                    onChange={(e) => setAt(e.target.value)}
                    aria-label={t.admin.odds.reservedAt}
                  />
                </div>
              </fieldset>

              <div className="btn-row">
                <button className="btn" onClick={() => setDraft({ ...DEFAULT_ODDS, prizes: draft.prizes })}>
                  {t.admin.odds.reset}
                </button>
                <button className="btn primary" onClick={saveOddsForm}>
                  {t.admin.odds.save}
                </button>
              </div>
            </section>
          )}

          {tab === 'prizes' && (
            <section>
              <div className="table-scroll">
                <table className="toon-table admin-table">
                  <thead>
                    <tr>
                      <th>{t.admin.prizes.order}</th>
                      <th>{t.admin.prizes.name}</th>
                      <th>{t.admin.prizes.type}</th>
                      <th>{t.admin.prizes.rate}</th>
                      <th>{t.admin.prizes.invName}</th>
                      <th>{t.admin.prizes.invValue}</th>
                      <th>{t.admin.prizes.weight}</th>
                      <th>{t.admin.prizes.chance}</th>
                      <th>{t.admin.prizes.stock}</th>
                      <th>{t.admin.prizes.visible}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...draft.prizes]
                      .sort((a, b) => a.order - b.order)
                      .map((p) => (
                        <tr key={p.key}>
                          <td>
                            <input
                              type="number"
                              min={1}
                              value={p.order}
                              onChange={(e) => updatePrize(p.key, { order: Number(e.target.value) })}
                            />
                          </td>
                          <td>
                            <input
                              value={p.name}
                              onChange={(e) => updatePrize(p.key, { name: e.target.value })}
                            />
                          </td>
                          <td>
                            <select
                              value={p.payoutType}
                              onChange={(e) =>
                                updatePrize(p.key, { payoutType: e.target.value as PayoutType })
                              }
                            >
                              {(['kernel', 'cash', 'inventory'] as PayoutType[]).map((k) => (
                                <option key={k} value={k}>
                                  {t.admin.prizes.types[k]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              step={0.1}
                              min={0}
                              value={p.payoutRate}
                              disabled={p.payoutType === 'inventory'}
                              onChange={(e) => updatePrize(p.key, { payoutRate: Number(e.target.value) })}
                            />
                          </td>
                          <td>
                            <input
                              value={p.inventoryName}
                              disabled={p.payoutType !== 'inventory'}
                              onChange={(e) => updatePrize(p.key, { inventoryName: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              value={p.inventoryValue}
                              disabled={p.payoutType !== 'inventory'}
                              onChange={(e) => updatePrize(p.key, { inventoryValue: Number(e.target.value) })}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              value={p.weight}
                              onChange={(e) => updatePrize(p.key, { weight: Number(e.target.value) })}
                            />
                          </td>
                          <td className="num">
                            {p.visible && totalWeight > 0
                              ? `${((p.weight / totalWeight) * 100).toFixed(1)}%`
                              : '-'}
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              value={p.stock}
                              onChange={(e) => updatePrize(p.key, { stock: Number(e.target.value) })}
                            />
                          </td>
                          <td>
                            <button
                              className={`chip-btn${p.visible ? ' on' : ''}`}
                              onClick={() => updatePrize(p.key, { visible: !p.visible })}
                            >
                              {p.visible ? t.admin.prizes.visible : t.admin.prizes.hidden}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p className="hint-text small">{t.admin.prizes.rateHint}</p>
              <div className="btn-row">
                <button
                  className="btn"
                  onClick={() => setDraft((d) => ({ ...d, prizes: DEFAULT_PRIZES }))}
                >
                  {t.admin.odds.reset}
                </button>
                <button className="btn primary" onClick={savePrizes}>
                  {t.admin.prizes.save}
                </button>
              </div>
            </section>
          )}

          {tab === 'stats' && (
            <section>
              <h3 className="admin-sub">{t.admin.stats.totals}</h3>
              <ul className="stat-cards">
                <li>
                  <b>{stats.totals.plays.toLocaleString()}</b>
                  <span>{t.admin.stats.plays}</span>
                </li>
                <li>
                  <b>{stats.totals.wins.toLocaleString()}</b>
                  <span>{t.admin.stats.wins}</span>
                </li>
                <li>
                  <b>{stats.totals.fails.toLocaleString()}</b>
                  <span>{t.admin.stats.fails}</span>
                </li>
                <li>
                  <b>
                    {stats.totals.plays > 0
                      ? `${((stats.totals.wins / stats.totals.plays) * 100).toFixed(1)}%`
                      : '-'}
                  </b>
                  <span>{t.admin.stats.winRate}</span>
                </li>
                <li>
                  <b>{stats.totals.kernelSpent.toLocaleString()}</b>
                  <span>{t.admin.stats.kernelSpent}</span>
                </li>
                <li>
                  <b>{stats.totals.kernelPaid.toLocaleString()}</b>
                  <span>{t.admin.stats.kernelPaid}</span>
                </li>
                <li>
                  <b>{stats.totals.cashPaid.toLocaleString()}</b>
                  <span>{t.admin.stats.cashPaid}</span>
                </li>
                <li>
                  <b>{stats.totals.inventoryPaid.toLocaleString()}</b>
                  <span>{t.admin.stats.inventoryPaid}</span>
                </li>
              </ul>

              <h3 className="admin-sub">{t.admin.stats.daily}</h3>
              {stats.daily.length === 0 ? (
                <p className="hint-text">{t.admin.stats.empty}</p>
              ) : (
                <div className="table-scroll">
                  <table className="toon-table">
                    <thead>
                      <tr>
                        <th>{t.admin.stats.date}</th>
                        <th>{t.admin.stats.plays}</th>
                        <th>{t.admin.stats.wins}</th>
                        <th>{t.admin.stats.fails}</th>
                        <th>{t.admin.stats.kernelSpent}</th>
                        <th>{t.admin.stats.kernelPaid}</th>
                        <th>{t.admin.stats.cashPaid}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.daily.map((d) => (
                        <tr key={d.date}>
                          <td>{d.date}</td>
                          <td className="num">{d.plays.toLocaleString()}</td>
                          <td className="num">{d.wins.toLocaleString()}</td>
                          <td className="num">{d.fails.toLocaleString()}</td>
                          <td className="num">{d.kernelSpent.toLocaleString()}</td>
                          <td className="num">{d.kernelPaid.toLocaleString()}</td>
                          <td className="num">{d.cashPaid.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 className="admin-sub">{t.admin.stats.byPrize}</h3>
              <div className="table-scroll">
                <table className="toon-table">
                  <thead>
                    <tr>
                      <th>{t.admin.stats.prize}</th>
                      <th>{t.admin.stats.wins}</th>
                      <th>{t.admin.stats.payout}</th>
                      <th>{t.admin.prizes.stock}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {odds.prizes.map((p) => (
                      <tr key={p.key}>
                        <td>{p.name}</td>
                        <td className="num">{(stats.prizes[p.key]?.wins ?? 0).toLocaleString()}</td>
                        <td className="num">{(stats.prizes[p.key]?.kernelValue ?? 0).toLocaleString()}</td>
                        <td className="num">{p.stock === 0 ? '∞' : p.stock.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="btn-row">
                <button
                  className="btn"
                  onClick={() =>
                    downloadCsv('tooneland-pick-stats.csv', [
                      ['일자', '총도전', '당첨', '꽝', '소진강냉이', '지급강냉이', '지급캐시', '지급인벤토리'],
                      ...stats.daily.map((d) => [
                        d.date,
                        d.plays,
                        d.wins,
                        d.fails,
                        d.kernelSpent,
                        d.kernelPaid,
                        d.cashPaid,
                        d.inventoryPaid,
                      ]),
                    ])
                  }
                >
                  {t.admin.stats.csv}
                </button>
                <button className="btn danger" onClick={() => { sound.play('click'); resetStats() }}>
                  {t.admin.stats.reset}
                </button>
              </div>
            </section>
          )}

          {tab === 'logs' && (
            <section>
              <h3 className="admin-sub">{t.admin.logs.title}</h3>
              {logs.length === 0 ? (
                <p className="hint-text">{t.admin.logs.empty}</p>
              ) : (
                <div className="table-scroll">
                  <table className="toon-table">
                    <thead>
                      <tr>
                        <th>{t.admin.logs.at}</th>
                        <th>{t.admin.logs.applied}</th>
                        <th>{t.admin.logs.mode}</th>
                        <th>{t.admin.logs.base}</th>
                        <th>{t.admin.logs.max}</th>
                        <th>{t.admin.logs.min}</th>
                        <th>{t.admin.logs.aim}</th>
                        <th>{t.admin.logs.cashback}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((l) => (
                        <tr key={`${l.at}-${l.appliedAt}`}>
                          <td>{new Date(l.at).toLocaleString('ko-KR')}</td>
                          <td>{new Date(l.appliedAt).toLocaleString('ko-KR')}</td>
                          <td>{t.admin.logs.modes[l.mode]}</td>
                          <td className="num">{l.baseWinRate}</td>
                          <td className="num">{l.maxWinRate}</td>
                          <td className="num">{l.minWinRate}</td>
                          <td className="num">{l.aimWeight}</td>
                          <td className="num">{l.cashbackPercent}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>

        {toast && (
          <div className="admin-toast" role="status">
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}
