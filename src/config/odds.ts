/**
 * 확률 모델
 *
 * 럭키픽 기획서의 "확률 설정" 정책(최대/최소 % · 적용 확률 · 캐시백)을 인형뽑기에 옮긴 모듈입니다.
 * 집게가 인형을 물었는지는 물리 판정(실력)이 결정하고, 물린 인형을 끝까지 들고 가는지(그립 유지)는
 * 이 파일의 확률이 결정합니다. 모든 값은 관리자 페이지에서 조정됩니다.
 */
import { DEFAULT_PRIZES, type ChannelKey, type PrizeConfig } from './toonelandConfig'

export interface OddsConfig {
  /** 기본 당첨 확률 (%) — 조준이 평범할 때의 그립 성공 확률 */
  baseWinRate: number
  /** 당첨 확률 최대치 (%) */
  maxWinRate: number
  /** 당첨 확률 최소치 (%) */
  minWinRate: number
  /** 조준 정확도 반영률 (%) — 0이면 실력과 무관하게 기본 확률만 적용 */
  aimWeight: number
  /**
   * 집기 판정 보정 (%) — 집게가 인형을 "잡았다"고 판정하는 감지 반경 배율.
   * 100이 기본값이며, 값을 올리면 더 쉽게 집히고 내리면 더 어렵게 집힙니다.
   */
  catchAssist: number
  /** 기본혜택(캐시백) — 꽝일 때 소진 강냉이의 몇 %를 돌려줄지 */
  cashbackPercent: number
  /** 연속 실패 n회 시 다음 판은 확정 당첨 (0이면 미적용) */
  pityAfter: number
  /** 채널별 확률 배율 */
  channelFactor: Record<ChannelKey, number>
  /** 상품(인형)별 설정 */
  prizes: PrizeConfig[]
}

export const DEFAULT_ODDS: OddsConfig = {
  baseWinRate: 35,
  maxWinRate: 63,
  minWinRate: 1,
  aimWeight: 50,
  catchAssist: 100,
  cashbackPercent: 4,
  pityAfter: 2,
  channelFactor: { novice: 1.2, middle: 1.0, expert: 0.9, hero: 0.8, legend: 0.7 },
  prizes: DEFAULT_PRIZES,
}

export function clampRate(odds: OddsConfig, rate: number): number {
  const min = Math.max(0, Math.min(odds.minWinRate, odds.maxWinRate))
  const max = Math.max(min, odds.maxWinRate)
  return Math.min(max, Math.max(min, rate))
}

/** 집기 판정 감지 반경 (관리자 보정 반영) */
export function catchSensorRadius(catchAssist: number, baseRadius: number): number {
  const scale = Math.max(20, Math.min(300, catchAssist)) / 100
  return baseRadius * scale
}

/** 채널에 표기되는 당첨 확률 (%) — 조준 보정 전의 기준값 */
export function channelWinRate(odds: OddsConfig, channel: ChannelKey): number {
  return clampRate(odds, odds.baseWinRate * (odds.channelFactor[channel] ?? 1))
}

export interface WinRateInput {
  odds: OddsConfig
  channel: ChannelKey
  /** 조준 편심도 0(정중앙) ~ 1(가장자리) */
  ecc: number
  /** 인형별 미끄러짐 계수 (클수록 놓치기 쉬움) */
  slipFactor: number
  /** 현재 연속 실패 횟수 */
  slipStreak: number
  /** 안전모드(연습) — 항상 성공 */
  steadyGrip?: boolean
}

/**
 * 이번 판의 그립 유지 확률 (0~1).
 * 기본 확률 × 채널 배율에 조준 보정을 적용하고, 관리자가 정한 최대/최소 범위로 잘라냅니다.
 */
export function computeWinChance(input: WinRateInput): number {
  const { odds, channel, ecc, slipFactor, slipStreak, steadyGrip } = input
  if (steadyGrip) return 1
  if (odds.pityAfter > 0 && slipStreak >= odds.pityAfter) return 1
  const aim = Math.max(0, Math.min(100, odds.aimWeight)) / 100
  // 조준이 정중앙이면 (1 + 반영률), 가장자리면 (1 - 반영률) 배
  const aimAdj = 1 + aim * (1 - 2 * Math.max(0, Math.min(1, ecc)))
  const rate = odds.baseWinRate * (odds.channelFactor[channel] ?? 1) * aimAdj
  const bySlip = rate / Math.max(0.2, slipFactor)
  return clampRate(odds, bySlip) / 100
}

/** 이번 판의 미끄러질 확률 (0~1) */
export function computeSlipChance(input: WinRateInput): number {
  return 1 - computeWinChance(input)
}

/** 꽝일 때 지급되는 기본혜택 강냉이 (소수점 절삭) */
export function cashbackKernels(odds: OddsConfig, cost: number): number {
  return Math.floor((cost * Math.max(0, odds.cashbackPercent)) / 100)
}

/**
 * 뽑기판에 올릴 수 있는 상품.
 * 당첨 인원이 모두 소진된 상품은 관리자 스토어에서 자동으로 숨김 처리되므로 노출 여부만 확인합니다.
 */
export function availablePrizes(odds: OddsConfig): PrizeConfig[] {
  return odds.prizes.filter((p) => p.visible && p.weight > 0)
}

/**
 * 가중치 기반 상품 추첨.
 * 노출 가능한 상품이 하나도 없으면 null을 돌려주며, 호출부에서 기본 인형으로 대체합니다.
 */
export function pickPrize(odds: OddsConfig, rand: () => number = Math.random): PrizeConfig | null {
  const pool = availablePrizes(odds)
  if (pool.length === 0) return null
  const total = pool.reduce((s, p) => s + p.weight, 0)
  if (total <= 0) return null
  let r = rand() * total
  for (const p of pool) {
    r -= p.weight
    if (r <= 0) return p
  }
  return pool[pool.length - 1]
}

/** 노출 순번 정렬 (1등 상품이 앞) */
export function sortedPrizes(odds: OddsConfig): PrizeConfig[] {
  return [...odds.prizes].sort((a, b) => a.order - b.order)
}
