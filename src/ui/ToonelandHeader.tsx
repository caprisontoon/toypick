import { useGameStore } from '../store/gameStore'
import { useAdminStore } from '../store/adminStore'
import { CHANNEL_MAP, SERVICE, gradeOf } from '../config/toonelandConfig'
import { sound } from '../audio/soundManager'
import { useT } from '../i18n'

/** 투네랜드 상단 바 — 도네이터 정보 · 보유 강냉이 · 충전 · 관리자 진입 */
export function ToonelandHeader() {
  const kernels = useGameStore((s) => s.kernels)
  const cash = useGameStore((s) => s.cash)
  const channel = useGameStore((s) => s.channel)
  const inLobby = useGameStore((s) => s.inLobby)
  const openOverlay = useGameStore((s) => s.openOverlay)
  const openCharge = useGameStore((s) => s.openCharge)
  const backToLobby = useGameStore((s) => s.backToLobby)
  const status = useGameStore((s) => s.status)
  const adminMode = useAdminStore((s) => s.adminMode)
  const t = useT()
  const grade = gradeOf(kernels)
  const canLeave = status !== 'GRABBING' && status !== 'COIN'

  return (
    <header className="toon-header">
      <div className="toon-brand">
        <span className="toon-logo" aria-hidden>
          🌽
        </span>
        <span className="toon-brand-text">
          <b>{t.toon.land}</b>
          <i>{t.toon.game}</i>
        </span>
        {!inLobby && (
          <span className="toon-channel-chip">{t.toon.channelLabel(CHANNEL_MAP[channel].name)}</span>
        )}
      </div>

      <div className="toon-user">
        <span className="toon-grade" style={{ color: grade.color }} title={t.toon.grade}>
          {grade.icon} {grade.name}
        </span>
        <span className="toon-nick">{SERVICE.guestNickname}</span>
        <span className="toon-wallet">
          <b>🌽 {kernels.toLocaleString()}</b>
          <i>💎 {cash.toLocaleString()}</i>
        </span>
        <button
          className="toon-btn"
          onClick={() => {
            sound.play('click')
            openCharge()
          }}
        >
          {t.toon.charge}
        </button>
        {!inLobby && (
          <button
            className="toon-btn ghost"
            disabled={!canLeave}
            onClick={() => {
              sound.play('click')
              backToLobby()
            }}
          >
            {t.toon.changeChannel}
          </button>
        )}
        {adminMode && (
          <button
            className="toon-btn admin"
            onClick={() => {
              sound.play('click')
              openOverlay('admin')
            }}
          >
            {t.toon.admin}
          </button>
        )}
      </div>
    </header>
  )
}
