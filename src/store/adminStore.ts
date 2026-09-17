/**
 * 관리자 스토어
 *
 * 럭키픽 관리자 페이지(확률 설정 · 도전 통계 · 상품 통계)를 인형뽑기용으로 옮긴 로컬 스토어입니다.
 * 확률은 "즉시" 또는 "예약" 시점에 반영되고, 변경 내역이 30건까지 기록됩니다.
 * ※ 데모 환경이라 브라우저 localStorage에 저장되며, 실서비스에서는 투네랜드 관리자 API와 연동합니다.
 */
import { create } from 'zustand'
import { DEFAULT_ODDS, type OddsConfig } from '../config/odds'
import { TOONELAND_KEYS, type PayoutType } from '../config/toonelandConfig'
import type { ToyTypeKey } from '../config/gameConfig'
import { storageGet, storageSet } from './persistence'

export interface OddsLog {
  /** 설정을 등록한 시각 */
  at: number
  /** 실제 반영 시각 */
  appliedAt: number
  mode: 'now' | 'reserved'
  baseWinRate: number
  maxWinRate: number
  minWinRate: number
  aimWeight: number
  cashbackPercent: number
}

export interface DayStat {
  date: string
  plays: number
  wins: number
  fails: number
  kernelSpent: number
  kernelPaid: number
  cashPaid: number
  inventoryPaid: number
}

export interface PrizeStat {
  wins: number
  kernelValue: number
}

export interface AdminStats {
  totals: Omit<DayStat, 'date'>
  daily: DayStat[]
  prizes: Partial<Record<ToyTypeKey, PrizeStat>>
}

const emptyTotals = (): Omit<DayStat, 'date'> => ({
  plays: 0,
  wins: 0,
  fails: 0,
  kernelSpent: 0,
  kernelPaid: 0,
  cashPaid: 0,
  inventoryPaid: 0,
})

const emptyDay = (date: string): DayStat => ({ date, ...emptyTotals() })

const defaultStats: AdminStats = { totals: emptyTotals(), daily: [], prizes: {} }

export function todayKey(now: number = Date.now()): string {
  const d = new Date(now)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

interface PersistedOdds {
  odds: OddsConfig
  /** 예약 설정 — 반영 시각이 지나면 자동 적용 */
  reserved: { at: number; odds: OddsConfig } | null
  logs: OddsLog[]
}

const persistedDefault: PersistedOdds = { odds: DEFAULT_ODDS, reserved: null, logs: [] }

function loadOdds(): PersistedOdds {
  const raw = storageGet(TOONELAND_KEYS.odds, persistedDefault)
  // 저장된 값이 구버전이어도 기본값으로 빈 칸을 채워 안전하게 복구
  return {
    odds: { ...DEFAULT_ODDS, ...raw.odds, prizes: raw.odds?.prizes?.length ? raw.odds.prizes : DEFAULT_ODDS.prizes },
    reserved: raw.reserved ?? null,
    logs: raw.logs ?? [],
  }
}

interface AdminStore {
  odds: OddsConfig
  reserved: { at: number; odds: OddsConfig } | null
  logs: OddsLog[]
  stats: AdminStats
  /** 관리자 모드 진입 여부 */
  adminMode: boolean
  /** 확률이 방금 바뀌었음을 이용자에게 알리기 위한 타임스탬프 */
  changeNotice: number

  setAdminMode: (on: boolean) => void
  /** 확률 설정 저장. mode가 'reserved'면 지정 시각에 반영 */
  saveOdds: (next: OddsConfig, mode: 'now' | 'reserved', at?: number) => void
  cancelReserved: () => void
  /** 예약된 설정이 도래했으면 적용 (라운드 시작 시 호출) */
  flushReserved: (now?: number) => boolean
  clearNotice: () => void
  /** 1회 플레이 기록 */
  recordPlay: (kernelSpent: number) => void
  /** 라운드 결과 기록 */
  recordResult: (
    result: 'win' | 'lose',
    payload: { prize?: ToyTypeKey; type?: PayoutType; amount?: number; kernelValue?: number },
  ) => void
  resetStats: () => void
  /** 당첨 인원 차감 */
  consumeStock: (prize: ToyTypeKey) => void
}

function persistOdds(state: PersistedOdds): void {
  storageSet(TOONELAND_KEYS.odds, state)
}

function toLog(odds: OddsConfig, mode: 'now' | 'reserved', at: number, appliedAt: number): OddsLog {
  return {
    at,
    appliedAt,
    mode,
    baseWinRate: odds.baseWinRate,
    maxWinRate: odds.maxWinRate,
    minWinRate: odds.minWinRate,
    aimWeight: odds.aimWeight,
    cashbackPercent: odds.cashbackPercent,
  }
}

const initial = loadOdds()

export const useAdminStore = create<AdminStore>((set, get) => ({
  odds: initial.odds,
  reserved: initial.reserved,
  logs: initial.logs,
  stats: storageGet(TOONELAND_KEYS.stats, defaultStats),
  adminMode: false,
  changeNotice: 0,

  setAdminMode: (on) => set({ adminMode: on }),

  saveOdds: (next, mode, at) => {
    const now = Date.now()
    if (mode === 'reserved' && at && at > now) {
      const reserved = { at, odds: next }
      const logs = [toLog(next, 'reserved', now, at), ...get().logs].slice(0, 30)
      persistOdds({ odds: get().odds, reserved, logs })
      set({ reserved, logs })
      return
    }
    const logs = [toLog(next, 'now', now, now), ...get().logs].slice(0, 30)
    persistOdds({ odds: next, reserved: null, logs })
    set({ odds: next, reserved: null, logs, changeNotice: now })
  },

  cancelReserved: () => {
    persistOdds({ odds: get().odds, reserved: null, logs: get().logs })
    set({ reserved: null })
  },

  flushReserved: (now = Date.now()) => {
    const { reserved, logs } = get()
    if (!reserved || reserved.at > now) return false
    persistOdds({ odds: reserved.odds, reserved: null, logs })
    set({ odds: reserved.odds, reserved: null, changeNotice: now })
    return true
  },

  clearNotice: () => set({ changeNotice: 0 }),

  recordPlay: (kernelSpent) => {
    set((st) => {
      const date = todayKey()
      const daily = [...st.stats.daily]
      const idx = daily.findIndex((d) => d.date === date)
      const day = idx >= 0 ? { ...daily[idx] } : emptyDay(date)
      day.plays += 1
      day.kernelSpent += kernelSpent
      if (idx >= 0) daily[idx] = day
      else daily.unshift(day)
      const stats: AdminStats = {
        ...st.stats,
        totals: {
          ...st.stats.totals,
          plays: st.stats.totals.plays + 1,
          kernelSpent: st.stats.totals.kernelSpent + kernelSpent,
        },
        daily: daily.slice(0, 60),
      }
      storageSet(TOONELAND_KEYS.stats, stats)
      return { stats }
    })
  },

  recordResult: (result, payload) => {
    set((st) => {
      const date = todayKey()
      const daily = [...st.stats.daily]
      const idx = daily.findIndex((d) => d.date === date)
      const day = idx >= 0 ? { ...daily[idx] } : emptyDay(date)
      const totals = { ...st.stats.totals }
      if (result === 'win') {
        day.wins += 1
        totals.wins += 1
      } else {
        day.fails += 1
        totals.fails += 1
      }
      const amount = payload.amount ?? 0
      if (payload.type === 'kernel') {
        day.kernelPaid += amount
        totals.kernelPaid += amount
      } else if (payload.type === 'cash') {
        day.cashPaid += amount
        totals.cashPaid += amount
      } else if (payload.type === 'inventory') {
        day.inventoryPaid += amount
        totals.inventoryPaid += amount
      }
      if (idx >= 0) daily[idx] = day
      else daily.unshift(day)

      const prizes = { ...st.stats.prizes }
      if (result === 'win' && payload.prize) {
        const prev = prizes[payload.prize] ?? { wins: 0, kernelValue: 0 }
        prizes[payload.prize] = {
          wins: prev.wins + 1,
          kernelValue: prev.kernelValue + (payload.kernelValue ?? 0),
        }
      }
      const stats: AdminStats = { totals, daily: daily.slice(0, 60), prizes }
      storageSet(TOONELAND_KEYS.stats, stats)
      return { stats }
    })
  },

  resetStats: () => {
    const stats: AdminStats = { totals: emptyTotals(), daily: [], prizes: {} }
    storageSet(TOONELAND_KEYS.stats, stats)
    set({ stats })
  },

  consumeStock: (prize) => {
    const { odds, reserved, logs } = get()
    const prizes = odds.prizes.map((p) => {
      if (p.key !== prize || p.stock === 0) return p
      const stock = Math.max(0, p.stock - 1)
      // 당첨 인원이 모두 소진되면 럭키픽 정책과 동일하게 자동 숨김 처리
      return { ...p, stock, visible: stock > 0 ? p.visible : false }
    })
    const next = { ...odds, prizes }
    persistOdds({ odds: next, reserved, logs })
    set({ odds: next })
  },
}))

// 개발 모드에서 자동화 테스트 · 디버깅을 위해 스토어 노출
if (import.meta.env.DEV) {
  ;(window as unknown as { __adminStore?: typeof useAdminStore }).__adminStore = useAdminStore
}
