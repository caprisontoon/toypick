import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ODDS,
  cashbackKernels,
  catchSensorRadius,
  channelWinRate,
  computeSlipChance,
  computeWinChance,
  pickPrize,
  sortedPrizes,
  type OddsConfig,
} from '../config/odds'

const base: OddsConfig = { ...DEFAULT_ODDS }

const input = (patch: Partial<Parameters<typeof computeWinChance>[0]> = {}) => ({
  odds: base,
  channel: 'middle' as const,
  ecc: 0.5,
  slipFactor: 1,
  slipStreak: 0,
  ...patch,
})

describe('확률 설정', () => {
  it('조준이 정중앙일수록 당첨 확률이 높아진다', () => {
    const center = computeWinChance(input({ ecc: 0 }))
    const mid = computeWinChance(input({ ecc: 0.5 }))
    const edge = computeWinChance(input({ ecc: 1 }))
    expect(center).toBeGreaterThan(mid)
    expect(mid).toBeGreaterThan(edge)
  })

  it('조준 반영률이 0이면 실력과 무관하게 기본 확률만 적용된다', () => {
    const odds = { ...base, aimWeight: 0 }
    expect(computeWinChance(input({ odds, ecc: 0 }))).toBeCloseTo(
      computeWinChance(input({ odds, ecc: 1 })),
      10,
    )
  })

  it('관리자가 정한 최대 · 최소 범위를 벗어나지 않는다', () => {
    const odds = { ...base, baseWinRate: 100, maxWinRate: 63, minWinRate: 5, aimWeight: 100 }
    expect(computeWinChance(input({ odds, ecc: 0 }))).toBeCloseTo(0.63, 10)
    const low = { ...odds, baseWinRate: 1 }
    expect(computeWinChance(input({ odds: low, ecc: 1 }))).toBeCloseTo(0.05, 10)
  })

  it('연속 실패 보정 횟수에 도달하면 확정 당첨이다', () => {
    expect(computeWinChance(input({ slipStreak: base.pityAfter }))).toBe(1)
    expect(computeSlipChance(input({ slipStreak: base.pityAfter }))).toBe(0)
  })

  it('연습 모드는 항상 성공한다', () => {
    expect(computeWinChance(input({ steadyGrip: true, ecc: 1 }))).toBe(1)
  })

  it('채널 배율이 낮을수록 표기 확률이 낮아진다', () => {
    expect(channelWinRate(base, 'novice')).toBeGreaterThan(channelWinRate(base, 'legend'))
  })

  it('미끄러질 확률과 당첨 확률의 합은 1이다', () => {
    expect(computeWinChance(input()) + computeSlipChance(input())).toBeCloseTo(1, 10)
  })
})

describe('집기 판정 보정', () => {
  it('100%면 채널 기본 반경 그대로다', () => {
    expect(catchSensorRadius(100, 0.06)).toBeCloseTo(0.06, 10)
  })

  it('값을 올리면 감지 반경이 넓어지고 내리면 좁아진다', () => {
    expect(catchSensorRadius(200, 0.06)).toBeCloseTo(0.12, 10)
    expect(catchSensorRadius(50, 0.06)).toBeCloseTo(0.03, 10)
  })

  it('과도한 입력은 20~300% 범위로 제한된다', () => {
    expect(catchSensorRadius(9999, 0.06)).toBeCloseTo(0.18, 10)
    expect(catchSensorRadius(0, 0.06)).toBeCloseTo(0.012, 10)
  })
})

describe('기본혜택(캐시백)', () => {
  it('소진 강냉이의 설정 비율만큼 소수점을 절삭해 지급한다', () => {
    expect(cashbackKernels({ ...base, cashbackPercent: 4 }, 1_000)).toBe(40)
    expect(cashbackKernels({ ...base, cashbackPercent: 4 }, 1_010)).toBe(40) // 40.4 → 40
    expect(cashbackKernels({ ...base, cashbackPercent: 0 }, 5_000)).toBe(0)
  })
})

describe('상품 추첨', () => {
  it('노출 중인 상품만 뽑히고 가중치 경계를 지킨다', () => {
    const pool = base.prizes.filter((p) => p.visible)
    expect(pickPrize(base, () => 0)?.key).toBe(pool[0].key)
    expect(pickPrize(base, () => 0.999999)?.key).toBe(pool[pool.length - 1].key)
  })

  it('숨김 처리한 상품은 뽑히지 않는다', () => {
    const odds = { ...base, prizes: base.prizes.map((p) => ({ ...p, visible: p.key === 'shiba' })) }
    for (let i = 0; i < 50; i++) {
      expect(pickPrize(odds, () => i / 50)?.key).toBe('shiba')
    }
  })

  it('노출 가능한 상품이 없으면 null을 돌려준다', () => {
    const odds = { ...base, prizes: base.prizes.map((p) => ({ ...p, visible: false })) }
    expect(pickPrize(odds)).toBeNull()
  })

  it('가중치 분포가 설정값을 따른다', () => {
    let seed = 7
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }
    const counts: Record<string, number> = {}
    const runs = 20000
    for (let i = 0; i < runs; i++) {
      const k = pickPrize(base, rand)!.key
      counts[k] = (counts[k] ?? 0) + 1
    }
    const total = base.prizes.reduce((s, p) => s + p.weight, 0)
    for (const p of base.prizes) {
      const expected = (p.weight / total) * runs
      expect(counts[p.key]).toBeGreaterThan(expected * 0.8)
      expect(counts[p.key]).toBeLessThan(expected * 1.2)
    }
  })

  it('노출 순번대로 정렬된다', () => {
    const orders = sortedPrizes(base).map((p) => p.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })
})
