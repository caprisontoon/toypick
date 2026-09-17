export type Difficulty = 'easy' | 'normal' | 'hard'
export type Quality = 'high' | 'low'

const BASE = import.meta.env.BASE_URL

export const ASSETS = {
  box: { webp: `${BASE}models/boxoutnew.glb`, fallback: `${BASE}models/boxoutnewWithOutWebp.glb` },
  dog: { webp: `${BASE}models/dogout.glb`, fallback: `${BASE}models/dogoutWithOutWebp.glb` },
  claw: { webp: `${BASE}models/clawoutnew.glb`, fallback: `${BASE}models/clawoutnew.glb` },
}

export const PHYSICS = {
  gravity: [0, -10, 0] as [number, number, number],
  floorY: -0.12,
  wallX: 0.85,
  wallZFront: 0.82,
  wallZBack: -0.83,
  wallTop: 2.05,
  // Exit chute (drop hole at front-right corner of the cabinet)
  hole: { minX: 0.16, maxX: 0.81, minZ: 0.39, maxZ: 0.84 },
  chuteFloorY: -0.58,
  guardWallTop: 0.42,
}

export const CLAW = {
  boundsX: [-0.6, 0.58] as [number, number],
  boundsZ: [-0.63, 0.6] as [number, number],
  restY: 0.95,
  bottomY: 0.0,
  homeX: 0,
  homeZ: 0,
  exitX: 0.49,
  exitZ: 0.58,
  baseMoveSpeed: 1.5,
  minSpeedFactor: 0.25,
  // Rod top snap height (inside the fixed gantry, world coordinates)
  rodTopY: 1.95,
  // Three-prong sensor: radius and height around the claw center (relative to claw group origin)
  sensorRing: 0.2,
  sensorRingClosed: 0.055,
  sensorHeight: 0.07,
}

export const COIN = {
  perGame: 15,
  dailyBonus: 5, // coins granted on first entry each day
  winReward: 1, // coins returned per win (must stay below the per-round cost to avoid inflation)
}

/** Grip & slip: player actions influence the outcome (aim accuracy, movement speed, difficulty) */
export const GRIP = {
  base: 0.1, // weak-grip probability floor even with a perfect grab
  eccentric: 0.5, // extra slip probability scaled by aim eccentricity (0..1)
  swingThreshold: 0.05, // swing amplitude above which fast movement adds slip hazard
  swingHazard: 4.0, // hazard rate per second per unit of swing above the threshold
  difficultyFactor: { easy: 0.7, normal: 1.0, hard: 1.35 } as Record<Difficulty, number>,
  pityAfter: 2, // after N consecutive slips the grip locks and the next catch holds (payout cycle)
}

export const TIMING = {
  coinDuration: 950,
  descendDuration: 2000,
  closeDuration: 1000,
  ascendDuration: 2000,
  moveExitDuration: 1400,
  releaseDuration: 900,
  settleDuration: 4000,
  returnDuration: 1700,
  failAscendDuration: 900, // accelerated recall when nothing was caught
  failReturnDuration: 900, // faster home return after a failed round
  coinFastDuration: 650, // shortened coin animation for consecutive plays
  cameraSnapDuration: 250,
  phaseTimeoutExtra: 8000,
}

export const RENDER = {
  maxDpr: 1.5,
  lowDpr: 1.0,
  minimapMaxSize: 200,
  cameraTarget: [0, 0.45, 0] as [number, number, number],
  cameraRadius: 4.6,
  cameraMinDistance: 3.2,
  cameraMaxDistance: 6.5,
  cameraPolar: [Math.PI * 0.28, Math.PI * 0.52] as [number, number],
  loadTimeoutMs: 15000,
}

export const TOY = {
  radius: 0.175,
  count: 15,
  /** 관리자에서 조절 가능한 인형 개수 범위 */
  minCount: 5,
  maxCount: 20,
}

/** 인형 1개의 생성 위치 (판 위 좌표 + 몇 번째 층에서 떨어뜨릴지) */
export interface SpawnSlot {
  x: number
  z: number
  /** 0이 맨 아래 층. 층마다 조금 더 높은 곳에서 떨어집니다 */
  tier: number
}

/**
 * 인형 개수에 맞는 생성 위치를 만듭니다.
 * 기본 개수 이하면 난이도별로 손으로 잡아둔 배치를 그대로 쓰고,
 * 그보다 많으면 판을 격자로 채우며 층을 쌓습니다. (출구 구멍 위에는 놓지 않습니다)
 */
export function buildSpawnSlots(count: number, layout: [number, number][]): SpawnSlot[] {
  if (count <= layout.length) {
    return layout.slice(0, count).map(([x, z], i) => ({ x, z, tier: i % 5 }))
  }

  // 인형이 서로 파고들지 않도록 지름만큼 간격을 둡니다
  const step = TOY.radius * 2 + 0.01
  // 층마다 격자를 통째로 조금 밀어 완전히 수직으로 쌓이지 않게 합니다 (수직 정렬은 물리가 떨립니다)
  const shift = 0.04
  const margin = TOY.radius + 0.02 + shift
  const minX = -PHYSICS.wallX + margin
  const maxX = PHYSICS.wallX - margin
  const minZ = PHYSICS.wallZBack + margin
  const maxZ = PHYSICS.wallZFront - margin
  const cols = Math.max(1, Math.floor((maxX - minX) / step) + 1)
  const rows = Math.max(1, Math.floor((maxZ - minZ) / step) + 1)
  // 격자를 판 가운데로 정렬
  const offsetX = minX + (maxX - minX - (cols - 1) * step) / 2
  const offsetZ = minZ + (maxZ - minZ - (rows - 1) * step) / 2

  const cells: { x: number; z: number }[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = offsetX + c * step
      const z = offsetZ + r * step
      // 출구 구멍 위는 그냥 떨어져 버리므로 제외
      const overHole =
        x > PHYSICS.hole.minX - TOY.radius &&
        x < PHYSICS.hole.maxX + TOY.radius &&
        z > PHYSICS.hole.minZ - TOY.radius &&
        z < PHYSICS.hole.maxZ + TOY.radius
      if (!overHole) cells.push({ x, z })
    }
  }
  if (cells.length === 0) return []

  return Array.from({ length: count }, (_, i) => {
    const tier = Math.floor(i / cells.length)
    const indexInTier = i % cells.length
    const tierCount = Math.min(count - tier * cells.length, cells.length)
    // 한 층을 다 채우지 못하는 경우 격자 칸을 건너뛰며 골라 판 전체에 고르게 퍼뜨립니다
    const cell = cells[Math.floor((indexInTier * cells.length) / tierCount)]
    // 같은 층은 같은 양만큼 밀리므로 층 안에서의 간격은 그대로 유지됩니다
    const dx = tier % 2 === 0 ? -shift : shift
    const dz = tier % 3 === 1 ? shift : -shift
    return { x: cell.x + dx, z: cell.z + dz, tier }
  })
}



export type Rarity = 'common' | 'rare' | 'hidden'
export type ToyTypeKey = 'shiba' | 'snow' | 'sakura' | 'golden' | 'cosmic'

export interface ToyTypeDef {
  key: ToyTypeKey
  rarity: Rarity
  /** Instance tint multiplied over the base texture */
  tint: string
  scale: number
  density: number
  /** Multiplier applied to the slip chance (heavier / slipperier toys) */
  slipFactor: number
  /** Stars awarded per catch */
  stars: number
  /** Spawn weight */
  weight: number
}

export const TOY_TYPES: ToyTypeDef[] = [
  { key: 'shiba', rarity: 'common', tint: '#ffffff', scale: 1.0, density: 1.0, slipFactor: 1.0, stars: 1, weight: 46 },
  { key: 'snow', rarity: 'common', tint: '#d9e8ff', scale: 0.94, density: 0.9, slipFactor: 0.95, stars: 1, weight: 22 },
  { key: 'sakura', rarity: 'rare', tint: '#ffb3d2', scale: 1.0, density: 1.0, slipFactor: 1.15, stars: 3, weight: 15 },
  { key: 'golden', rarity: 'rare', tint: '#ffd257', scale: 1.08, density: 1.35, slipFactor: 1.3, stars: 4, weight: 11 },
  { key: 'cosmic', rarity: 'hidden', tint: '#b48cff', scale: 0.9, density: 0.85, slipFactor: 1.45, stars: 8, weight: 6 },
]

export const TOY_TYPE_MAP: Record<ToyTypeKey, ToyTypeDef> = Object.fromEntries(
  TOY_TYPES.map((t) => [t.key, t]),
) as Record<ToyTypeKey, ToyTypeDef>

/** Weighted random toy type */
export function rollToyType(rand: () => number = Math.random): ToyTypeDef {
  const total = TOY_TYPES.reduce((s, t) => s + t.weight, 0)
  let r = rand() * total
  for (const t of TOY_TYPES) {
    r -= t.weight
    if (r <= 0) return t
  }
  return TOY_TYPES[0]
}

export interface DifficultyPreset {
  label: string
  speedFactor: number
  sensorRadius: number
  layout: [number, number][]
}

const sparse: [number, number][] = [
  [0, 0.05], [-0.42, -0.1], [0.42, -0.1], [-0.2, -0.45],
  [0.2, -0.45], [0, -0.25], [-0.45, 0.28], [0.35, 0.22],
]
const normal: [number, number][] = [
  [0, 0], [-0.4, 0.15], [0.4, 0.05], [-0.55, -0.25], [0.55, -0.3],
  [-0.2, -0.35], [0.2, -0.5], [0, 0.35], [-0.5, 0.45], [0.45, -0.55],
]
const dense: [number, number][] = [
  [-0.6, 0.45], [-0.62, 0.1], [-0.6, -0.25], [-0.58, -0.58], [-0.25, -0.6],
  [0.15, -0.6], [0.55, -0.58], [0.6, -0.2], [0.28, -0.35], [-0.28, -0.4],
]

export const DIFFICULTY: Record<Difficulty, DifficultyPreset> = {
  easy: { label: 'Easy', speedFactor: 0.8, sensorRadius: 0.085, layout: sparse },
  normal: { label: 'Normal', speedFactor: 1.0, sensorRadius: 0.06, layout: normal },
  hard: { label: 'Hard', speedFactor: 1.2, sensorRadius: 0.042, layout: dense },
}

export const STORAGE_KEYS = {
  settings: 'claw3d.settings.v1',
  stats: 'claw3d.stats.v1',
  tutorial: 'claw3d.tutorialDone.v1',
  wallet: 'claw3d.wallet.v1',
  progress: 'claw3d.progress.v1',
}
