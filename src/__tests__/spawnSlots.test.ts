import { describe, expect, it } from 'vitest'
import { DIFFICULTY, PHYSICS, TOY, buildSpawnSlots } from '../config/gameConfig'

const layout = DIFFICULTY.normal.layout

describe('인형 생성 위치', () => {
  it('기본 개수 이하면 손으로 잡아둔 배치를 그대로 쓴다', () => {
    const slots = buildSpawnSlots(6, layout)
    expect(slots).toHaveLength(6)
    slots.forEach((s, i) => {
      expect([s.x, s.z]).toEqual(layout[i])
    })
  })

  it('요청한 개수만큼 만든다', () => {
    for (const n of [10, 30, 60]) {
      expect(buildSpawnSlots(n, layout)).toHaveLength(n)
    }
  })

  it('모든 인형이 판 안에 들어간다', () => {
    for (const s of buildSpawnSlots(60, layout)) {
      expect(Math.abs(s.x)).toBeLessThanOrEqual(PHYSICS.wallX - TOY.radius)
      expect(s.z).toBeGreaterThanOrEqual(PHYSICS.wallZBack + TOY.radius - 0.001)
      expect(s.z).toBeLessThanOrEqual(PHYSICS.wallZFront - TOY.radius + 0.001)
    }
  })

  it('출구 구멍 위에는 놓지 않는다', () => {
    for (const s of buildSpawnSlots(60, layout)) {
      const overHole =
        s.x > PHYSICS.hole.minX && s.x < PHYSICS.hole.maxX &&
        s.z > PHYSICS.hole.minZ && s.z < PHYSICS.hole.maxZ
      expect(overHole).toBe(false)
    }
  })

  it('같은 층 안에서는 인형끼리 겹치지 않는다', () => {
    const slots = buildSpawnSlots(60, layout)
    const byTier = new Map<number, typeof slots>()
    for (const s of slots) byTier.set(s.tier, [...(byTier.get(s.tier) ?? []), s])
    for (const tierSlots of byTier.values()) {
      for (let i = 0; i < tierSlots.length; i++) {
        for (let j = i + 1; j < tierSlots.length; j++) {
          const d = Math.hypot(tierSlots[i].x - tierSlots[j].x, tierSlots[i].z - tierSlots[j].z)
          expect(d).toBeGreaterThanOrEqual(TOY.radius * 2 - 0.001)
        }
      }
    }
  })

  it('한 층을 다 채운 뒤 위층으로 쌓는다', () => {
    const slots = buildSpawnSlots(60, layout)
    const tiers = slots.map((s) => s.tier)
    expect(Math.min(...tiers)).toBe(0)
    // 층 번호는 줄어들지 않는 순서로 배정된다
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b))
  })
})
