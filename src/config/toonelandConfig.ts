/**
 * 투네랜드 공통 설정
 *
 * 투네이션 2차 화폐인 "강냉이"를 소진시키는 투네랜드(당첨왕 · 럭키픽) 게임 정책을
 * 인형뽑기에 맞춰 정리한 파일입니다. 등급 / 채널 / 상품 기준값은 기존 기획서를 따릅니다.
 *  - 강냉이 환산값 : 1 캐시 = 25 강냉이 (럭키픽 기획서)
 *  - 보유 등급     : 초보 0 · 중수 10만 · 고수 30만 · 지존 80만 · 영웅 100만 · 전설 300만
 *  - 채널 소진값   : 초보 1,000 · 중수-고수 3,000 · 고수-지존 10,000 · 고수-영웅 50,000 · 전설 100,000
 */
import type { Difficulty, ToyTypeKey } from './gameConfig'

/** 서비스 표기 */
export const SERVICE = {
  land: '투네랜드',
  game: '인형뽑기',
  /** 투네랜드 샵(강냉이 충전) 링크 — 실서비스 연동 시 실제 URL로 교체 */
  shopUrl: 'https://toon.at/',
  /** 데모 환경에서 보여줄 기본 닉네임 */
  guestNickname: '도네이터',
}

export const CURRENCY = {
  kernel: '강냉이',
  cash: '캐시',
  /** 1 캐시 = 25 강냉이 */
  kernelPerCash: 25,
  /** 출석체크 보너스(무료 강냉이) */
  dailyBonus: 1_000,
  /** 데모 지갑 초기 강냉이 */
  initialKernels: 30_000,
  /** 데모 충전 버튼 1회 지급량 */
  demoChargeKernels: 10_000,
}

/** 캐시 → 강냉이 환산 */
export function cashToKernel(cash: number): number {
  return Math.floor(cash * CURRENCY.kernelPerCash)
}

/** 강냉이 → 캐시 환산 (소수점 절삭) */
export function kernelToCash(kernel: number): number {
  return Math.floor(kernel / CURRENCY.kernelPerCash)
}

export type GradeKey = 'novice' | 'middle' | 'expert' | 'master' | 'hero' | 'legend'

export interface GradeDef {
  key: GradeKey
  /** 등급명 */
  name: string
  /** 등급 기준 보유 강냉이 */
  min: number
  icon: string
  color: string
}

export const GRADES: GradeDef[] = [
  { key: 'novice', name: '초보', min: 0, icon: '🌱', color: '#4ad991' },
  { key: 'middle', name: '중수', min: 100_000, icon: '🌰', color: '#c98a3f' },
  { key: 'expert', name: '고수', min: 300_000, icon: '⚪', color: '#e8ecf5' },
  { key: 'master', name: '지존', min: 800_000, icon: '⭐', color: '#ffc93c' },
  { key: 'hero', name: '영웅', min: 1_000_000, icon: '💠', color: '#57b0ff' },
  { key: 'legend', name: '전설', min: 3_000_000, icon: '👑', color: '#ff5f7e' },
]

/** 보유 강냉이로 등급 산출 (기준 이상 중 가장 높은 등급) */
export function gradeOf(kernels: number): GradeDef {
  let found = GRADES[0]
  for (const g of GRADES) if (kernels >= g.min) found = g
  return found
}

export type ChannelKey = 'novice' | 'middle' | 'expert' | 'hero' | 'legend'

export interface ChannelDef {
  key: ChannelKey
  /** 프론트에 노출되는 채널 이름 */
  name: string
  /** 1회(1뽑기) 소진 강냉이 */
  cost: number
  /** 권장 등급 안내 문구 */
  recommend: string
  /** 채널 난이도 (인형 배치 · 집게 감지 반경) */
  difficulty: Difficulty
  /** 노출 순번 */
  order: number
}

/**
 * 채널 목록. 당첨왕과 동일하게 "모든 방 입장 가능" 정책이며,
 * 보유 강냉이가 회당 비용보다 적으면 충전 안내가 노출됩니다.
 */
export const CHANNELS: ChannelDef[] = [
  { key: 'novice', name: '초보', cost: 1_000, recommend: '초보 등급 이상', difficulty: 'easy', order: 1 },
  { key: 'middle', name: '중수 - 고수', cost: 3_000, recommend: '중수 등급 이상 추천', difficulty: 'normal', order: 2 },
  { key: 'expert', name: '고수 - 지존', cost: 10_000, recommend: '고수 등급 이상 추천', difficulty: 'normal', order: 3 },
  { key: 'hero', name: '고수 - 영웅', cost: 50_000, recommend: '영웅 등급 이상 추천', difficulty: 'hard', order: 4 },
  { key: 'legend', name: '전설', cost: 100_000, recommend: '전설 등급 추천', difficulty: 'hard', order: 5 },
]

export const CHANNEL_MAP: Record<ChannelKey, ChannelDef> = Object.fromEntries(
  CHANNELS.map((c) => [c.key, c]),
) as Record<ChannelKey, ChannelDef>

/** 지급(당첨) 종류 — 당첨왕 · 럭키픽 관리자와 동일 */
export type PayoutType = 'kernel' | 'cash' | 'inventory'

export interface PrizeConfig {
  /** 인형(상품) 키 — 3D 인형 종류와 1:1 대응 */
  key: ToyTypeKey
  /** 상품 이름 */
  name: string
  /** 지급 종류 */
  payoutType: PayoutType
  /**
   * 지급 배수 — 채널 회당 소진 강냉이 대비 지급량.
   * 강냉이/캐시 지급은 (회당 비용 × 배수)를 기준으로 산출합니다.
   */
  payoutRate: number
  /** 인벤토리 지급 시 상품명 (기프티콘 등) */
  inventoryName: string
  /** 인벤토리 상품의 강냉이 환산값 */
  inventoryValue: number
  /** 등장(당첨) 가중치 */
  weight: number
  /** 당첨 인원 — 0이면 무한 */
  stock: number
  /** 프론트 노출 여부 (숨김 처리 시 뽑기판에 등장하지 않음) */
  visible: boolean
  /** 노출 순번 (작을수록 먼저 노출, 1번이 1등 상품) */
  order: number
}

/** 상품(인형) 기본값 — 관리자 페이지에서 수정 가능 */
export const DEFAULT_PRIZES: PrizeConfig[] = [
  {
    key: 'cosmic',
    name: '우주 인형',
    payoutType: 'inventory',
    payoutRate: 0,
    inventoryName: '스타벅스 아메리카노 교환권',
    inventoryValue: 100_000,
    weight: 6,
    stock: 30,
    visible: true,
    order: 1,
  },
  {
    key: 'golden',
    name: '황금 인형',
    payoutType: 'cash',
    payoutRate: 5,
    inventoryName: '',
    inventoryValue: 0,
    weight: 11,
    stock: 0,
    visible: true,
    order: 2,
  },
  {
    key: 'sakura',
    name: '벚꽃 인형',
    payoutType: 'kernel',
    payoutRate: 3,
    inventoryName: '',
    inventoryValue: 0,
    weight: 15,
    stock: 0,
    visible: true,
    order: 3,
  },
  {
    key: 'snow',
    name: '눈송이 인형',
    payoutType: 'kernel',
    payoutRate: 1.5,
    inventoryName: '',
    inventoryValue: 0,
    weight: 22,
    stock: 0,
    visible: true,
    order: 4,
  },
  {
    key: 'shiba',
    name: '시바 인형',
    payoutType: 'kernel',
    payoutRate: 1.2,
    inventoryName: '',
    inventoryValue: 0,
    weight: 46,
    stock: 0,
    visible: true,
    order: 5,
  },
]

/** 상품 1회 당첨 시 지급량과 강냉이 환산값 */
export function prizePayout(
  prize: PrizeConfig,
  cost: number,
): { type: PayoutType; amount: number; kernelValue: number; label: string } {
  if (prize.payoutType === 'inventory') {
    return {
      type: 'inventory',
      amount: 1,
      kernelValue: prize.inventoryValue,
      label: prize.inventoryName || prize.name,
    }
  }
  if (prize.payoutType === 'cash') {
    const amount = Math.max(1, Math.floor((cost * prize.payoutRate) / CURRENCY.kernelPerCash))
    return { type: 'cash', amount, kernelValue: cashToKernel(amount), label: `${amount.toLocaleString()} 캐시` }
  }
  const amount = Math.max(1, Math.floor(cost * prize.payoutRate))
  return { type: 'kernel', amount, kernelValue: amount, label: `${amount.toLocaleString()} 강냉이` }
}

/** 투네랜드 저장소 키 */
export const TOONELAND_KEYS = {
  wallet: 'tooneland.pick.wallet.v1',
  odds: 'tooneland.pick.odds.v1',
  stats: 'tooneland.pick.adminStats.v1',
  playHistory: 'tooneland.pick.playHistory.v1',
  inventory: 'tooneland.pick.inventory.v1',
  consent: 'tooneland.pick.consent.v1',
  rulesHide: 'tooneland.pick.rulesHide.v1',
  channel: 'tooneland.pick.channel.v1',
}
