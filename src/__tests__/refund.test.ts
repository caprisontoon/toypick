import { beforeEach, describe, expect, it } from 'vitest'
import { clearInterrupted, markInterrupted } from '../store/gameStore'
import { storageGet } from '../store/persistence'
import { TOONELAND_KEYS } from '../config/toonelandConfig'

const readWallet = () =>
  storageGet(TOONELAND_KEYS.wallet, { kernels: 0, cash: 0, lastBonusDay: '', pendingRefund: 0 })

describe('라운드 중단 시 강냉이 반환 예약', () => {
  beforeEach(() => {
    window.localStorage.setItem(
      TOONELAND_KEYS.wallet,
      JSON.stringify({ kernels: 10_000, cash: 0, lastBonusDay: '2026-1-1', pendingRefund: 0 }),
    )
  })

  it('markInterrupted는 보유 강냉이를 건드리지 않고 반환 예정 금액만 기록한다', () => {
    markInterrupted(1000)
    const w = readWallet()
    expect(w.pendingRefund).toBe(1000)
    expect(w.kernels).toBe(10_000)
  })

  it('pagehide가 여러 번 발생해도 반환 금액이 누적되지 않는다', () => {
    markInterrupted(1000)
    markInterrupted(1000)
    markInterrupted(1000)
    const w = readWallet()
    expect(w.pendingRefund).toBe(1000)
    expect(w.kernels).toBe(10_000)
  })

  it('bfcache로 라운드가 이어지면 예약이 해제된다', () => {
    markInterrupted(3000)
    clearInterrupted()
    const w = readWallet()
    expect(w.pendingRefund).toBe(0)
    expect(w.kernels).toBe(10_000)
  })
})
