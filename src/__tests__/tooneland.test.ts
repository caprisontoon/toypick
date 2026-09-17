import { describe, expect, it } from 'vitest'
import {
  CHANNELS,
  CURRENCY,
  DEFAULT_PRIZES,
  GRADES,
  cashToKernel,
  gradeOf,
  kernelToCash,
  prizePayout,
} from '../config/toonelandConfig'

describe('강냉이 · 캐시 환산', () => {
  it('1 캐시는 25 강냉이다', () => {
    expect(CURRENCY.kernelPerCash).toBe(25)
    expect(cashToKernel(3_000)).toBe(75_000)
  })

  it('강냉이를 캐시로 바꿀 때 소수점은 절삭한다', () => {
    expect(kernelToCash(75_000)).toBe(3_000)
    expect(kernelToCash(74_999)).toBe(2_999)
  })
})

describe('등급', () => {
  it('보유 강냉이 기준으로 등급이 정해진다', () => {
    expect(gradeOf(0).name).toBe('초보')
    expect(gradeOf(99_999).name).toBe('초보')
    expect(gradeOf(100_000).name).toBe('중수')
    expect(gradeOf(300_000).name).toBe('고수')
    expect(gradeOf(800_000).name).toBe('지존')
    expect(gradeOf(1_000_000).name).toBe('영웅')
    expect(gradeOf(9_999_999).name).toBe('전설')
  })

  it('등급 기준이 오름차순이다', () => {
    const mins = GRADES.map((g) => g.min)
    expect(mins).toEqual([...mins].sort((a, b) => a - b))
  })
})

describe('채널', () => {
  it('노출 순번과 소진 강냉이가 함께 올라간다', () => {
    const costs = CHANNELS.map((c) => c.cost)
    expect(costs).toEqual([...costs].sort((a, b) => a - b))
    expect(costs[0]).toBe(1_000)
  })
})

describe('상품 지급', () => {
  const prize = (key: string) => DEFAULT_PRIZES.find((p) => p.key === key)!

  it('강냉이 상품은 회당 비용 × 배수로 지급된다', () => {
    const payout = prizePayout(prize('sakura'), 1_000)
    expect(payout.type).toBe('kernel')
    expect(payout.amount).toBe(3_000)
    expect(payout.kernelValue).toBe(3_000)
  })

  it('캐시 상품은 25강냉이 = 1캐시로 환산해 지급된다', () => {
    const payout = prizePayout(prize('golden'), 1_000)
    expect(payout.type).toBe('cash')
    expect(payout.amount).toBe(200) // 1,000 × 5 ÷ 25
    expect(payout.kernelValue).toBe(5_000)
  })

  it('인벤토리 상품은 수량 1개와 강냉이 환산값으로 지급된다', () => {
    const p = prize('cosmic')
    const payout = prizePayout(p, 1_000)
    expect(payout.type).toBe('inventory')
    expect(payout.amount).toBe(1)
    expect(payout.kernelValue).toBe(p.inventoryValue)
    expect(payout.label).toBe(p.inventoryName)
  })

  it('채널 비용이 커지면 지급량도 함께 커진다', () => {
    expect(prizePayout(prize('shiba'), 10_000).amount).toBe(12_000)
    expect(prizePayout(prize('shiba'), 1_000).amount).toBe(1_200)
  })

  it('노출 순번 1번이 가장 값진 상품이다', () => {
    const first = [...DEFAULT_PRIZES].sort((a, b) => a.order - b.order)[0]
    expect(first.key).toBe('cosmic')
    expect(first.payoutType).toBe('inventory')
  })
})
