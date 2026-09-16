import { useEffect, useState } from 'react'
import { remainingToys, useGameStore } from '../store/gameStore'
import { CHANNEL_MAP } from '../config/toonelandConfig'
import { sound } from '../audio/soundManager'
import { useT } from '../i18n'

export function StartButton() {
  const status = useGameStore((s) => s.status)
  const toys = useGameStore((s) => s.toys)
  const kernels = useGameStore((s) => s.kernels)
  const channel = useGameStore((s) => s.channel)
  const startGrab = useGameStore((s) => s.startGrab)
  const insertKernel = useGameStore((s) => s.insertKernel)
  const coinHint = useGameStore((s) => s.coinHint)
  const t = useT()
  const [hintOn, setHintOn] = useState(false)

  // 강냉이를 넣지 않고 조작한 경우: 버튼을 강조하고 안내 말풍선을 띄움
  useEffect(() => {
    if (coinHint === 0) return
    setHintOn(true)
    const id = window.setTimeout(() => setHintOn(false), 1600)
    return () => window.clearTimeout(id)
  }, [coinHint])

  const grabbing = status === 'GRABBING'
  const unpaid = status === 'UNPAID'
  const cost = CHANNEL_MAP[channel].cost
  const lack = kernels < cost
  // 강냉이가 모자라도 버튼은 눌리게 두고, 누르면 충전 안내를 띄웁니다
  const enabled = unpaid
    ? remainingToys(toys) > 0
    : (status === 'READY' || status === 'MOVING') && remainingToys(toys) > 0

  return (
    <>
      {hintOn && unpaid && (
        <div className="coin-hint" role="status">
          {t.start.insertFirst}
        </div>
      )}
      <button
        className={`start-btn${grabbing ? ' grabbing' : ''}${hintOn && unpaid ? ' attention' : ''}${
          unpaid && lack ? ' lack' : ''
        }`}
        disabled={!enabled}
        aria-label={unpaid ? t.start.insert : t.start.aria}
        aria-disabled={!enabled}
        onClick={() => {
          sound.unlock()
          if (unpaid) {
            if (insertKernel()) sound.play('click')
            return
          }
          if (startGrab()) {
            sound.play('click')
            sound.play('descend')
            sound.vibrate(40)
          }
        }}
      >
        {grabbing ? (
          t.start.grabbing
        ) : unpaid ? (
          <>
            {t.start.insert}
            <i className="start-cost">🌽 {cost.toLocaleString()}</i>
          </>
        ) : (
          t.start.label
        )}
      </button>
    </>
  )
}
