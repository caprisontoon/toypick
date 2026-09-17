import { ACHIEVEMENTS, useGameStore } from '../store/gameStore'
import { useAdminStore } from '../store/adminStore'
import { TOY_TYPES } from '../config/gameConfig'
import { sound } from '../audio/soundManager'
import { useT } from '../i18n'

const RARITY_CLASS = { common: 'r-common', rare: 'r-rare', hidden: 'r-hidden' } as const

/** 인형 도감 — 인형별 등급 · 보유 수량 · 별 · 업적 */
export function AlbumPanel() {
  const progress = useGameStore((s) => s.progress)
  const closeOverlay = useGameStore((s) => s.closeOverlay)
  const prizes = useAdminStore((s) => s.odds.prizes)
  const t = useT()
  const A = t.album
  // 관리자에서 상품 이름을 바꾼 경우 도감에도 같은 이름을 노출
  const nameOf = (key: string) => prizes.find((p) => p.key === key)?.name ?? A.toys[key]

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={A.title}>
      <div className="modal album-card">
        <button
          className="modal-close"
          aria-label="close"
          onClick={() => {
            sound.play('click')
            closeOverlay()
          }}
        >
          ✕
        </button>
        <h2>{A.title}</h2>
        <p className="album-stars">⭐ {progress.stars}</p>
        <div className="album-grid">
          {TOY_TYPES.map((toy) => {
            const count = progress.collection[toy.key] ?? 0
            const owned = count > 0
            return (
              <div key={toy.key} className={`album-cell ${RARITY_CLASS[toy.rarity]}${owned ? '' : ' locked'}`}>
                <span className="album-icon" style={owned ? { color: toy.tint } : undefined}>
                  {owned ? '🧸' : '❓'}
                </span>
                <b>{owned || toy.rarity !== 'hidden' ? nameOf(toy.key) : '???'}</b>
                <i>{A.rarity[toy.rarity]}</i>
                <em>{owned ? `×${count}` : A.notOwned}</em>
              </div>
            )
          })}
        </div>
        <h3>{A.achievements}</h3>
        <div className="album-achievements">
          {ACHIEVEMENTS.map((a) => {
            const owned = progress.achievements.includes(a.id)
            return (
              <div key={a.id} className={`ach-row${owned ? ' owned' : ''}`}>
                <span>{owned ? '🏆' : '🔒'}</span>
                <div>
                  <b>{A.achv[a.id]?.name ?? a.id}</b>
                  <i>{A.achv[a.id]?.desc ?? ''}</i>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
