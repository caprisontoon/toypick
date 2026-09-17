import { create } from 'zustand'
import {
  DIFFICULTY,
  STORAGE_KEYS,
  TIMING,
  TOY,
  TOY_TYPES,
  TOY_TYPE_MAP,
  rollToyType,
  type Difficulty,
  type Quality,
  type ToyTypeKey,
} from '../config/gameConfig'
import {
  CHANNEL_MAP,
  CURRENCY,
  TOONELAND_KEYS,
  gradeOf,
  prizePayout,
  type ChannelKey,
  type GradeDef,
  type PayoutType,
} from '../config/toonelandConfig'
import { cashbackKernels, pickPrize } from '../config/odds'
import { useAdminStore } from './adminStore'
import { storageGet, storageRemove, storageSet } from './persistence'
import { clearMovementInput, refs, resetRoundRefs } from './refs'

export type GameStatus =
  | 'BOOT'
  | 'UNSUPPORTED'
  | 'LOADING'
  | 'TUTORIAL'
  | 'COIN'
  | 'UNPAID'
  | 'READY'
  | 'MOVING'
  | 'CAMERA_SNAP'
  | 'GRABBING'
  | 'RESULT'
  | 'PAUSED'
  | 'RESETTING'
  | 'COMPLETED'
  | 'ERROR'

export interface Progress {
  stars: number
  collection: Partial<Record<ToyTypeKey, number>>
  achievements: string[]
}

export type SlipReason = 'eccentric' | 'fastMove' | 'weakGrip'

export type Overlay =
  | 'none'
  | 'settings'
  | 'help'
  | 'history'
  | 'confirmRestart'
  | 'confirmClear'
  | 'album'
  | 'admin'
  | 'playHistory'
  | 'inventory'
  | 'charge'

export interface ToyMeta {
  id: number
  status: 'inBox' | 'held' | 'out'
  spawn: [number, number]
  type: ToyTypeKey
}

export interface Settings {
  music: boolean
  sfx: boolean
  vibration: boolean
  minimap: boolean
  quality: Quality
  difficulty: Difficulty
  debug: boolean
  perfPanel: boolean
  language: 'ko' | 'en' | 'zh'
  /** Steady-grip mode: a grabbed toy never slips (assist/demo) */
  steadyGrip: boolean
  /** Aim assist: projection ring under the claw with a catchable hint */
  aimAssist: boolean
  /** Auto cinematic camera (coin close-up / carry follow); off = fully manual */
  autoCamera: boolean
  /** Left-handed layout: joystick on the right, start button on the left */
  leftHanded: boolean
  /** Joystick re-centers to wherever the finger lands (mobile) */
  joystickFollow: boolean
  /** Slow the claw near a catchable toy for precise aiming */
  precisionSlow: boolean
}

export interface RoundRecord {
  result: 'success' | 'fail'
  timeMs: number
  at: number
}

export interface Stats {
  attempts: number
  successes: number
  fastestTime: number | null
  recent: RoundRecord[]
}

/** 게임참여내역 1행 — 당첨왕 기획서의 참여내역 테이블과 같은 항목 */
export interface PlayRecord {
  /** 목록 렌더링용 고유 키 (같은 밀리초에 기록돼도 겹치지 않도록) */
  id: string
  at: number
  channel: ChannelKey
  /** 참여내역 (소진 강냉이) */
  cost: number
  /** 당첨 결과 */
  result: 'win' | 'lose' | 'refund'
  prizeKey?: ToyTypeKey
  /** 당첨내역에 노출되는 상품명 */
  prizeName?: string
  /** 당첨종류 — 강냉이 · 캐시 · 인벤토리 */
  payoutType?: PayoutType
  payoutAmount?: number
  /** 지급 내역 표기 문구 */
  payoutLabel?: string
}

/** 인벤토리(기프티콘 등 실물 상품) 보관함 */
export interface InventoryItem {
  id: string
  name: string
  at: number
  kernelValue: number
}

/** 이번 라운드 결과에 함께 노출할 지급 내역 */
export interface PayoutInfo {
  type: PayoutType | 'cashback'
  amount: number
  label: string
  prizeName?: string
}

const defaultSettings: Settings = {
  music: true,
  sfx: true,
  vibration: true,
  minimap: true,
  quality: 'high',
  difficulty: 'normal',
  debug: false,
  perfPanel: false,
  language: 'ko',
  steadyGrip: false,
  aimAssist: true,
  autoCamera: true,
  leftHanded: false,
  joystickFollow: false,
  precisionSlow: true,
}

const defaultStats: Stats = { attempts: 0, successes: 0, fastestTime: null, recent: [] }

/** 관리자 설정(노출 상품 · 가중치)에 따라 뽑기판에 올릴 인형을 결정 */
function rollPrizeToyType(): ToyTypeKey {
  const odds = useAdminStore.getState().odds
  return pickPrize(odds)?.key ?? rollToyType().key
}

function buildToys(difficulty: Difficulty): ToyMeta[] {
  return DIFFICULTY[difficulty].layout.slice(0, TOY.count).map((spawn, i) => ({
    id: i,
    status: 'inBox' as const,
    spawn,
    type: rollPrizeToyType(),
  }))
}

interface GameStore {
  status: GameStatus
  statusBeforePause: GameStatus
  cameraDirection: 0 | 1 | 2 | 3
  toys: ToyMeta[]
  attempts: number
  successes: number
  /** 보유 강냉이 */
  kernels: number
  /** 보유 캐시 */
  cash: number
  /** 출석체크(일일) 보너스 강냉이 */
  dailyBonus: number
  /** 선택한 채널 */
  channel: ChannelKey
  /** 채널 선택(로비) 화면 노출 여부 */
  inLobby: boolean
  /** 투네랜드 이용 동의 완료 여부 */
  consent: boolean
  /** 이번 라운드에 소진한 강냉이 */
  roundCost: number
  /** 충전 안내 팝업에 노출할 필요 강냉이 */
  chargeNeed: number
  /** 게임참여내역 */
  playHistory: PlayRecord[]
  /** 인벤토리 상품 목록 */
  inventory: InventoryItem[]
  /** 이번 라운드 지급 내역 */
  payoutInfo: PayoutInfo | null
  coinHint: number
  slipFlash: { reason: SlipReason; at: number } | null
  progress: Progress
  /** Recently unlocked achievement ids queued for the toast */
  achievementFlash: string | null
  photoMode: boolean
  resultInfo: { result: 'success' | 'fail'; timeMs: number; bounced?: boolean; slipped?: boolean; slipReason?: SlipReason | null } | null
  overlay: Overlay
  loadError: string | null
  resetNonce: number
  tutorialDone: boolean
  tutorialStep: number
  settings: Settings
  stats: Stats
  unsupportedReason: string | null
  errorMessage: string | null

  setStatus: (s: GameStatus) => void
  setUnsupported: (reason: string) => void
  setLoadError: (msg: string | null) => void
  finishLoading: () => void
  setTutorialStep: (n: number) => void
  finishTutorial: (hideForWeek?: boolean) => void
  setCameraDirection: (d: 0 | 1 | 2 | 3) => void
  startGrab: () => boolean
  /** 강냉이를 투입해 1회 뽑기를 시작 */
  insertKernel: () => boolean
  finishRound: (result: 'success' | 'fail', timeMs: number, bounced?: boolean, slipped?: boolean, slipReason?: SlipReason | null, wonToyId?: number) => void
  setToyStatus: (id: number, status: ToyMeta['status']) => void
  playAgain: () => void
  closeResult: () => void
  restartGame: () => void
  finishReset: () => void
  clearDailyBonus: () => void
  askCoin: () => void
  /** 채널 입장 */
  enterChannel: (channel: ChannelKey) => void
  /** 채널 선택 화면으로 복귀 */
  backToLobby: () => void
  /** 투네랜드 이용 동의 */
  acceptConsent: () => void
  /** 데모 충전 — 실서비스에서는 캐시 충전 결과를 서버에서 반영 */
  chargeKernels: (amount?: number) => void
  /** 충전 안내 팝업 노출 (필요 강냉이를 함께 전달) */
  openCharge: (need?: number) => void
  /** One machine shake per game: nudges all toys with random impulses */
  shakeUsed: boolean
  shakeMachine: () => void
  flashSlip: (reason: SlipReason) => void
  clearSlipFlash: () => void
  clearAchievementFlash: () => void
  setPhotoMode: (on: boolean) => void
  pause: () => void
  resume: () => void
  openOverlay: (o: Overlay) => void
  closeOverlay: () => void
  updateSettings: (patch: Partial<Settings>) => void
  clearStats: () => void
  fatalError: (msg: string) => void
  retryFromError: () => void
}

/** 지갑: 강냉이·캐시는 브라우저에 저장되고, 하루 첫 입장 시 출석 보너스가 지급됩니다 */
function localDay(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

interface Wallet {
  kernels: number
  cash: number
  lastBonusDay: string
  /** 라운드 도중 이탈 시 돌려줄 강냉이 (0이면 없음) */
  pendingRefund: number
}

const emptyWallet: Wallet = {
  kernels: CURRENCY.initialKernels,
  cash: 0,
  lastBonusDay: '',
  pendingRefund: 0,
}

const initialWallet = (() => {
  const w = storageGet(TOONELAND_KEYS.wallet, emptyWallet)
  const today = localDay()
  const bonus = w.lastBonusDay === today ? 0 : CURRENCY.dailyBonus
  // 이탈로 중단된 라운드의 강냉이는 다음 진입 시 한 번만 반환
  const refund = w.pendingRefund > 0 ? w.pendingRefund : 0
  const kernels = w.kernels + bonus + refund
  const next: Wallet = { kernels, cash: w.cash, lastBonusDay: today, pendingRefund: 0 }
  storageSet(TOONELAND_KEYS.wallet, next)
  return { kernels, cash: w.cash, bonus, refund }
})()

/**
 * 라운드 중단 보호. pagehide는 페이지가 실제로 파기되지 않아도(bfcache) 반복 발생하므로
 * 여기서는 강냉이를 직접 건드리지 않고 반환 예정 금액만 기록합니다. 실제 반환은 다음 진입 때
 * 한 번만 정산되고, bfcache로 라운드가 이어지면 플래그가 취소됩니다.
 */
export function markInterrupted(amount: number): void {
  const w = storageGet(TOONELAND_KEYS.wallet, emptyWallet)
  storageSet(TOONELAND_KEYS.wallet, { ...w, pendingRefund: amount })
}

export function clearInterrupted(): void {
  const w = storageGet(TOONELAND_KEYS.wallet, emptyWallet)
  if (w.pendingRefund > 0) storageSet(TOONELAND_KEYS.wallet, { ...w, pendingRefund: 0 })
}

const defaultProgress: Progress = { stars: 0, collection: {}, achievements: [] }

interface AchievementCtx {
  result: 'success' | 'fail'
  timeMs: number
  slipped: boolean
  streak: number
  attemptsTotal: number
  successesTotal: number
  collection: Partial<Record<ToyTypeKey, number>>
  settings: Settings
}

/** Session-scoped success streak (not persisted) */
let currentStreak = 0

/** Late-bound toy body registry (set by Toys.tsx) to avoid a circular import */
export const toyBodies = new Map<number, { wakeUp: () => void; applyImpulse: (v: { x: number; y: number; z: number }, wake: boolean) => void }>()

export const ACHIEVEMENTS: { id: string; check: (c: AchievementCtx) => boolean }[] = [
  { id: 'firstWin', check: (c) => c.result === 'success' && c.successesTotal >= 1 },
  { id: 'oneShot', check: (c) => c.result === 'success' && c.attemptsTotal === 1 },
  { id: 'streak3', check: (c) => c.streak >= 3 },
  { id: 'luckyRoll', check: (c) => c.result === 'success' && c.slipped },
  { id: 'fast10', check: (c) => c.result === 'success' && c.timeMs <= 10000 },
  { id: 'hardWin', check: (c) => c.result === 'success' && c.settings.difficulty === 'hard' },
  { id: 'noAssist', check: (c) => c.result === 'success' && !c.settings.aimAssist },
  { id: 'noMinimap', check: (c) => c.result === 'success' && !c.settings.minimap },
  {
    id: 'collectAll',
    check: (c) => TOY_TYPES.every((t) => (c.collection[t.key] ?? 0) > 0),
  },
]

function persistProgress(p: Progress): void {
  storageSet(STORAGE_KEYS.progress, p)
}

function persistWallet(kernels: number, cash: number): void {
  const w = storageGet(TOONELAND_KEYS.wallet, emptyWallet)
  // 정상적으로 라운드 정산이 이루어졌으므로 남아있던 반환 예약은 해제
  storageSet(TOONELAND_KEYS.wallet, {
    kernels,
    cash,
    lastBonusDay: w.lastBonusDay || localDay(),
    pendingRefund: 0,
  })
}

let recordSeq = 0

/** 게임참여내역 행의 고유 키 */
function newRecordId(): string {
  recordSeq += 1
  return `${Date.now()}-${recordSeq}`
}

function persistPlayHistory(list: PlayRecord[]): void {
  storageSet(TOONELAND_KEYS.playHistory, { list })
}

function persistInventory(list: InventoryItem[]): void {
  storageSet(TOONELAND_KEYS.inventory, { list })
}

const initialChannel = storageGet(TOONELAND_KEYS.channel, { key: 'novice' as ChannelKey }).key
const initialConsent = storageGet(TOONELAND_KEYS.consent, { agreed: false }).agreed

export const useGameStore = create<GameStore>((set, get) => ({
  status: 'BOOT',
  statusBeforePause: 'READY',
  cameraDirection: 0,
  toys: buildToys(CHANNEL_MAP[initialChannel]?.difficulty ?? 'normal'),
  attempts: 0,
  successes: 0,
  kernels: initialWallet.kernels,
  cash: initialWallet.cash,
  dailyBonus: initialWallet.bonus,
  channel: initialChannel,
  inLobby: true,
  consent: initialConsent,
  roundCost: 0,
  chargeNeed: 0,
  playHistory: storageGet(TOONELAND_KEYS.playHistory, { list: [] as PlayRecord[] }).list,
  inventory: storageGet(TOONELAND_KEYS.inventory, { list: [] as InventoryItem[] }).list,
  payoutInfo: null,
  coinHint: 0,
  shakeUsed: false,
  slipFlash: null,
  progress: storageGet(STORAGE_KEYS.progress, defaultProgress),
  achievementFlash: null,
  photoMode: false,
  resultInfo: null,
  overlay: 'none',
  loadError: null,
  resetNonce: 0,
  // 게임규칙은 입장할 때마다 노출되고, '7일 동안 보지 않기'를 누른 경우에만 숨겨집니다
  tutorialDone: storageGet(STORAGE_KEYS.tutorial, { done: false, until: 0 }).until > Date.now(),
  tutorialStep: 0,
  settings: storageGet(STORAGE_KEYS.settings, defaultSettings),
  stats: storageGet(STORAGE_KEYS.stats, defaultStats),
  unsupportedReason: null,
  errorMessage: null,

  setStatus: (s) => set({ status: s }),
  setUnsupported: (reason) => set({ status: 'UNSUPPORTED', unsupportedReason: reason }),
  setLoadError: (msg) => set({ loadError: msg }),

  finishLoading: () => {
    const { tutorialDone } = get()
    if (tutorialDone) {
      // 입장 즉시 강냉이가 빠지지 않도록, 이용자가 직접 '강냉이 투입'을 눌러야 시작됩니다
      set({ status: 'UNPAID', tutorialStep: 0, loadError: null })
    } else {
      set({ status: 'TUTORIAL', tutorialStep: 0, loadError: null })
    }
  },

  setTutorialStep: (n) => set({ tutorialStep: n }),
  /** 게임규칙 종료. '7일 동안 보지 않기'를 누르면 7일간 다시 노출되지 않습니다 */
  finishTutorial: (hideForWeek) => {
    const until = hideForWeek ? Date.now() + 7 * 24 * 60 * 60 * 1000 : 0
    storageSet(STORAGE_KEYS.tutorial, { done: hideForWeek === true, until })
    // 이번 접속 중에는 채널을 바꿔도 규칙을 다시 띄우지 않습니다
    set({ tutorialDone: true, status: 'UNPAID' })
  },

  /** 강냉이 투입: 채널 회당 비용을 차감하고 투입 연출로 진입 */
  insertKernel: () => {
    const { kernels, channel } = get()
    const cost = CHANNEL_MAP[channel].cost
    if (kernels < cost) {
      set({ status: 'UNPAID', overlay: 'charge', chargeNeed: cost })
      return false
    }
    // 예약된 확률 설정이 도래했으면 이번 라운드부터 반영
    useAdminStore.getState().flushReserved()
    refs.coinStart = performance.now()
    // 연속 플레이는 투입 연출을 짧게
    refs.coinDuration = get().attempts > 0 ? TIMING.coinFastDuration : TIMING.coinDuration
    refs.skipAnim = false
    const nextKernels = kernels - cost
    persistWallet(nextKernels, get().cash)
    useAdminStore.getState().recordPlay(cost)
    set({ status: 'COIN', kernels: nextKernels, roundCost: cost, payoutInfo: null })
    return true
  },

  setCameraDirection: (d) => set({ cameraDirection: d }),

  startGrab: () => {
    const { status, overlay } = get()
    if (overlay !== 'none') return false
    if (status !== 'READY' && status !== 'MOVING') return false
    clearMovementInput()
    resetRoundRefs()
    refs.grabPhase = 'descend'
    refs.phaseStart = performance.now()
    refs.roundStartedAt = performance.now()
    set({ status: 'GRABBING' })
    return true
  },

  finishRound: (result, timeMs, bounced, slipped, slipReason, wonToyId) => {
    const { stats, attempts, successes, kernels, cash, toys, progress, settings, channel, roundCost } = get()
    const admin = useAdminStore.getState()
    const record: RoundRecord = { result, timeMs, at: Date.now() }
    const nextStats: Stats = {
      attempts: stats.attempts + 1,
      successes: stats.successes + (result === 'success' ? 1 : 0),
      fastestTime:
        result === 'success'
          ? stats.fastestTime == null
            ? timeMs
            : Math.min(stats.fastestTime, timeMs)
          : stats.fastestTime,
      recent: [record, ...stats.recent].slice(0, 10),
    }
    storageSet(STORAGE_KEYS.stats, nextStats)

    // 당첨 · 꽝 정산: 당첨이면 상품 지급, 꽝이면 기본혜택(캐시백) 강냉이 지급
    let nextKernels = kernels
    let nextCash = cash
    let nextInventory = get().inventory
    let payoutInfo: PayoutInfo | null = null
    let playRecord: PlayRecord

    if (result === 'success' && wonToyId != null) {
      const toyType = toys.find((t) => t.id === wonToyId)?.type ?? 'shiba'
      const prize = admin.odds.prizes.find((p) => p.key === toyType)
      if (prize) {
        const payout = prizePayout(prize, roundCost)
        if (payout.type === 'kernel') nextKernels += payout.amount
        else if (payout.type === 'cash') nextCash += payout.amount
        else {
          nextInventory = [
            { id: `${Date.now()}-${prize.key}`, name: payout.label, at: Date.now(), kernelValue: payout.kernelValue },
            ...nextInventory,
          ].slice(0, 100)
          persistInventory(nextInventory)
        }
        admin.consumeStock(prize.key)
        admin.recordResult('win', {
          prize: prize.key,
          type: payout.type,
          amount: payout.amount,
          kernelValue: payout.kernelValue,
        })
        payoutInfo = { type: payout.type, amount: payout.amount, label: payout.label, prizeName: prize.name }
        playRecord = {
          id: newRecordId(),
          at: Date.now(),
          channel,
          cost: roundCost,
          result: 'win',
          prizeKey: prize.key,
          prizeName: prize.name,
          payoutType: payout.type,
          payoutAmount: payout.amount,
          payoutLabel: payout.label,
        }
      } else {
        admin.recordResult('win', {})
        playRecord = { id: newRecordId(), at: Date.now(), channel, cost: roundCost, result: 'win' }
      }
    } else {
      const cashback = cashbackKernels(admin.odds, roundCost)
      if (cashback > 0) nextKernels += cashback
      admin.recordResult('lose', { type: 'kernel', amount: cashback })
      payoutInfo = cashback > 0 ? { type: 'cashback', amount: cashback, label: `${cashback.toLocaleString()} 강냉이` } : null
      playRecord = {
        id: newRecordId(),
        at: Date.now(),
        channel,
        cost: roundCost,
        result: 'lose',
        payoutType: cashback > 0 ? 'kernel' : undefined,
        payoutAmount: cashback > 0 ? cashback : undefined,
        payoutLabel: cashback > 0 ? `기본혜택 ${cashback.toLocaleString()} 강냉이` : undefined,
      }
    }
    if (nextKernels !== kernels || nextCash !== cash) persistWallet(nextKernels, nextCash)
    const nextHistory = [playRecord, ...get().playHistory].slice(0, 200)
    persistPlayHistory(nextHistory)

    // Collection & stars: rarity-based star reward, duplicates keep counting
    let nextProgress = progress
    let unlocked: string | null = null
    if (result === 'success' && wonToyId != null) {
      const toyType = toys.find((t) => t.id === wonToyId)?.type ?? 'shiba'
      const def = TOY_TYPE_MAP[toyType]
      const collection = { ...progress.collection, [toyType]: (progress.collection[toyType] ?? 0) + 1 }
      nextProgress = { ...progress, stars: progress.stars + def.stars, collection }
    }
    // Achievements
    const ctx = {
      result,
      timeMs,
      slipped: !!slipped,
      streak: result === 'success' ? currentStreak + 1 : 0,
      attemptsTotal: nextStats.attempts,
      successesTotal: nextStats.successes,
      collection: nextProgress.collection,
      settings,
    }
    currentStreak = ctx.streak
    for (const a of ACHIEVEMENTS) {
      if (nextProgress.achievements.includes(a.id)) continue
      if (a.check(ctx)) {
        nextProgress = { ...nextProgress, achievements: [...nextProgress.achievements, a.id] }
        unlocked = a.id
      }
    }
    if (nextProgress !== progress) persistProgress(nextProgress)
    set({
      status: 'RESULT',
      resultInfo: { result, timeMs, bounced, slipped, slipReason },
      attempts: attempts + 1,
      successes: successes + (result === 'success' ? 1 : 0),
      kernels: nextKernels,
      cash: nextCash,
      inventory: nextInventory,
      playHistory: nextHistory,
      payoutInfo,
      stats: nextStats,
      progress: nextProgress,
      ...(unlocked ? { achievementFlash: unlocked } : {}),
    })
  },

  setToyStatus: (id, status) =>
    set((st) => ({ toys: st.toys.map((t) => (t.id === id ? { ...t, status } : t)) })),

  playAgain: () => {
    const { toys } = get()
    const remaining = toys.filter((t) => t.status === 'inBox').length
    if (remaining === 0) {
      set({ resultInfo: null, status: 'COMPLETED' })
      return
    }
    set({ resultInfo: null })
    get().insertKernel()
  },

  /** 강냉이를 투입하지 않고 결과창을 닫음 — 다시 '강냉이 투입'을 누르면 재개 */
  closeResult: () => set({ resultInfo: null, status: 'UNPAID' }),

  restartGame: () => {
    const { settings } = get()
    clearMovementInput()
    resetRoundRefs()
    set((st) => ({
      status: 'RESETTING',
      overlay: 'none',
      resultInfo: null,
      payoutInfo: null,
      toys: buildToys(settings.difficulty),
      attempts: 0,
      successes: 0,
      shakeUsed: false,
      resetNonce: st.resetNonce + 1,
    }))
  },

  clearDailyBonus: () => set({ dailyBonus: 0 }),

  /** 채널 입장 — 채널 난이도로 뽑기판을 새로 구성 */
  enterChannel: (channel) => {
    const def = CHANNEL_MAP[channel]
    if (!def) return
    storageSet(TOONELAND_KEYS.channel, { key: channel })
    const settings = { ...get().settings, difficulty: def.difficulty }
    storageSet(STORAGE_KEYS.settings, settings)
    useAdminStore.getState().flushReserved()
    clearMovementInput()
    resetRoundRefs()
    set((st) => ({
      channel,
      settings,
      inLobby: false,
      overlay: 'none',
      resultInfo: null,
      payoutInfo: null,
      toys: buildToys(def.difficulty),
      attempts: 0,
      successes: 0,
      shakeUsed: false,
      status: st.tutorialDone ? 'UNPAID' : 'TUTORIAL',
      resetNonce: st.resetNonce + 1,
    }))
  },

  backToLobby: () => {
    const { status } = get()
    if (status === 'GRABBING' || status === 'COIN') return
    clearMovementInput()
    set({ inLobby: true, overlay: 'none', resultInfo: null, status: 'UNPAID' })
  },

  acceptConsent: () => {
    storageSet(TOONELAND_KEYS.consent, { agreed: true })
    set({ consent: true })
  },

  openCharge: (need) => set((st) => ({ overlay: 'charge', chargeNeed: need ?? CHANNEL_MAP[st.channel].cost })),

  chargeKernels: (amount = CURRENCY.demoChargeKernels) => {
    const kernels = get().kernels + amount
    persistWallet(kernels, get().cash)
    set({ kernels, overlay: 'none' })
  },

  shakeMachine: () => {
    const { shakeUsed, status, toys } = get()
    if (shakeUsed) return
    if (status !== 'READY' && status !== 'MOVING' && status !== 'UNPAID') return
    refs.shakeAt = performance.now()
    for (const toy of toys) {
      if (toy.status !== 'inBox') continue
      const body = toyBodies.get(toy.id)
      if (!body) continue
      body.wakeUp()
      body.applyImpulse(
        { x: (Math.random() - 0.5) * 0.02, y: Math.random() * 0.025, z: (Math.random() - 0.5) * 0.02 },
        true,
      )
    }
    set({ shakeUsed: true })
  },

  /** Instant on-screen callout at the moment the toy slips */
  flashSlip: (reason) => set({ slipFlash: { reason, at: Date.now() } }),
  clearSlipFlash: () => set({ slipFlash: null }),
  clearAchievementFlash: () => set({ achievementFlash: null }),
  setPhotoMode: (on) => set({ photoMode: on, overlay: 'none' }),

  /** 강냉이를 넣지 않고 조작한 경우 투입 안내를 띄움 (1.5초 간격) */
  askCoin: () => {
    const now = Date.now()
    if (now - get().coinHint > 1500) set({ coinHint: now })
  },

  finishReset: () => {
    if (get().status === 'RESETTING') set({ status: 'UNPAID' })
  },

  pause: () => {
    const { status } = get()
    if (status !== 'READY' && status !== 'MOVING') return
    clearMovementInput()
    set({ status: 'PAUSED', statusBeforePause: status })
  },

  resume: () => {
    if (get().status === 'PAUSED') set({ status: 'READY', overlay: 'none' })
  },

  openOverlay: (o) => set({ overlay: o }),
  closeOverlay: () => set({ overlay: 'none' }),

  updateSettings: (patch) => {
    const next = { ...get().settings, ...patch }
    storageSet(STORAGE_KEYS.settings, next)
    set({ settings: next })
  },

  clearStats: () => {
    storageRemove(STORAGE_KEYS.stats)
    storageRemove(TOONELAND_KEYS.playHistory)
    set({ stats: defaultStats, playHistory: [], overlay: 'none' })
  },

  fatalError: (msg) => {
    clearMovementInput()
    set({ status: 'ERROR', errorMessage: msg })
  },

  retryFromError: () =>
    set((st) => ({ status: 'LOADING', errorMessage: null, resetNonce: st.resetNonce + 1 })),
}))

export function remainingToys(toys: ToyMeta[]): number {
  return toys.filter((t) => t.status === 'inBox').length
}

/** 현재 보유 강냉이 기준 등급 */
export function currentGrade(kernels: number): GradeDef {
  return gradeOf(kernels)
}

// Expose the store for automated tests/debugging (dev only)
if (import.meta.env.DEV) {
  ;(window as unknown as { __gameStore?: typeof useGameStore }).__gameStore = useGameStore
}
