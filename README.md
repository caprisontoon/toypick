# 투네랜드 인형뽑기 (Tooneland Claw Machine)

투네이션 2차 화폐 **강냉이**를 소진시키는 투네랜드용 3D 인형뽑기 미니게임입니다.
[Claw Machine 3D](https://github.com/caprisontoon/toypick)(React 19 + Three.js + Rapier)를 기반으로,
투네랜드 **당첨왕 · 럭키픽** 기획서의 정책(강냉이 경제 · 등급 · 채널 · 기본혜택 · 관리자 확률 설정)을 반영했습니다.

## 투네랜드 적용 내용

| 구분 | 내용 |
| --- | --- |
| 재화 | 동전 → **강냉이**. 1 캐시 = 25 강냉이 환산, 캐시 · 인벤토리(기프티콘) 지급 지원 |
| 채널 | 초보 1,000 / 중수-고수 3,000 / 고수-지존 10,000 / 고수-영웅 50,000 / 전설 100,000 강냉이 (1회 소진) |
| 등급 | 보유 강냉이 기준 초보 · 중수(10만) · 고수(30만) · 지존(80만) · 영웅(100만) · 전설(300만) |
| 기본혜택 | 꽝일 때 소진 강냉이의 관리자 설정 %를 강냉이로 환급 (소수점 절삭) |
| 게임참여내역 | 게임 시간 · 게임유형 · 참여내역 · 당첨내역 · 당첨 결과 · 당첨종류 (20행 페이징) |
| 인벤토리 | 기프티콘 등 실물 상품 당첨 시 보관함에 적립 |
| 이용 동의 | 최초 입장 시 강냉이 환불 불가 안내 팝업 |
| 충전 안내 | 강냉이 부족 시 충전 팝업 + 투네랜드 샵 링크 |
| 게임규칙 | 입장 시 규칙 안내(4단계) · "7일 동안 보지 않기" 지원 |
| 언어 | **한국어 기본**, 영어 · 중국어는 한국어 사전 위에 덮어쓰는 부분 번역 방식 |
| 디자인 | 투네랜드 톤앤매너(둥근 한글 폰트, 보라 + 강냉이 골드 팔레트, 상단 도네이터 바) |

## 관리자 (확률 설정)

`?admin=1` 주소로 접속하거나 게임 화면에서 **Ctrl/⌘ + Shift + A** 를 누르면 상단에 `관리자` 버튼이 나타납니다.

- **확률 설정** — 기본 당첨 확률 / 최대 · 최소 % / 조준 정확도 반영률 / 집기 판정 보정 / 기본혜택(캐시백) % /
  연속 실패 보정 / 채널별 확률 배율, **즉시 · 예약** 적용, 채널별 적용 확률 미리보기
- **상품 관리** — 상품명, 지급 종류(강냉이 · 캐시 · 인벤토리), 지급 배수, 강냉이 환산값, 당첨 가중치,
  당첨 인원(0 = 무한, 소진 시 자동 숨김), 노출 순번, 노출 · 숨김
- **도전 통계** — 누적 · 일자별 도전 / 당첨 / 꽝 / 소진 · 지급 강냉이 · 캐시, 상품별 통계, CSV 내려받기
- **변경 내역** — 확률 변경 이력 30건 (등록 · 반영 일시, 즉시 · 예약 구분)

확률이 변경되면 플레이 중인 이용자에게 `아이템 설정 값이 변경되었습니다` 안내가 노출되고, 다음 판부터 새 확률이 적용됩니다.

> ⚠️ 관리자 화면과 지갑 · 통계는 **브라우저 localStorage에 저장되는 데모 구현**입니다.
> 실서비스에 붙일 때는 확률 · 상품 · 통계 · 지갑을 투네랜드 관리자 서버(API)로 연결해 주세요.

## 확률 구조

한 판의 결과는 두 단계로 결정됩니다.

1. **집기 판정(실력)** — 집게 세 갈래가 같은 인형에 닿아야 집힙니다. 판정 반경은 채널 난이도 × 관리자 `집기 판정 보정(%)`
2. **그립 유지(확률)** — 집은 인형을 출구까지 들고 갈 확률. `기본 당첨 확률 × 채널 배율 × 조준 보정`을
   관리자가 정한 최대 · 최소 범위로 자른 값이며, 연속 실패 보정 횟수에 도달하면 확정 당첨입니다.

실제 당첨률은 관리자 **도전 통계**의 당첨률로 확인하면서 두 값을 함께 조정하면 됩니다.

## 주요 파일

```
src/
├── config/
│   ├── toonelandConfig.ts  # 강냉이 경제 · 등급 · 채널 · 상품(인형) 정의
│   ├── odds.ts             # 확률 모델 (그립 유지 · 집기 보정 · 캐시백 · 상품 추첨)
│   └── gameConfig.ts       # 물리 · 집게 · 타이밍 등 게임 기본값
├── store/
│   ├── adminStore.ts       # 관리자 설정 · 예약 적용 · 변경 내역 · 통계
│   └── gameStore.ts        # 게임 상태 · 지갑 · 채널 · 게임참여내역 · 인벤토리
├── ui/
│   ├── ToonelandHeader.tsx # 상단 투네랜드 바 (등급 · 보유 강냉이 · 충전)
│   ├── LobbyScreen.tsx     # 채널 선택 화면
│   ├── AdminPanel.tsx      # 관리자 페이지
│   └── ToonelandPanels.tsx # 이용 동의 · 충전 · 게임참여내역 · 인벤토리
└── i18n/ko.ts              # 한국어 기준 사전
```

## 실행

```bash
npm install
npm run dev        # 개발 서버
npm run typecheck  # 타입 검사
npm run lint
npm test           # 확률 · 강냉이 경제 · 환산 단위 테스트
npm run build      # dist/ 프로덕션 빌드
```

배포 경로는 `vite.config.ts`의 `repoName`으로 정해집니다. 투네랜드에 삽입할 때는 실제 서비스 경로로 바꿔주세요.

---

# Claw Machine 3D (원본 게임 설명)

A fully client-side 3D claw machine game built with **React 19 + Three.js + Rapier physics**. Aim with the joystick and minimap, drop the claw, and pray your grip holds — the toy can slip mid-carry just like a real arcade machine. Coins, toy collection, achievements, and progress all persist locally; no server required.

## Live Preview

> https://neciszhang.github.io/claw3d/

## Screenshot

![Claw Machine 3D Gameplay](screenshot/20260807172320.jpg)

## Gameplay

- **Insert kernels** (channel cost per grab), move the claw with the joystick / WASD / arrow keys, press **START**
- The three-prong claw physically closes around toys — a toy touched by all three prongs is caught
- Caught ≠ won: the toy **swings while carried and can slip**, driven by your aim accuracy, movement speed, toy weight, and difficulty; slipping near the chute can still luckily roll in
- Two consecutive slips lock the grip: the next catch is guaranteed (pity system)
- Wins pay out the prize configured in the admin panel (kernels / cash / inventory) plus rarity-based ⭐ stars

## Features

### Core experience
- Real rigid-body simulation (Rapier): toy collision, stacking, swinging, slipping
- Aim assist: floor projection ring that turns gold over a catchable toy (toggleable)
- Slip reasons surfaced to the player: off-center grab / moved too fast / weak grip
- Catch / slip / drop-in feedback: claw jolt & bite pause, camera shake & callouts, coin fly-in
- Fast failure recovery: accelerated recall on a miss, skip button, shortened coin animation on replays

### Content & progression (all localStorage, no backend)
- **5 toy variants across 3 rarity tiers** (common / rare / hidden) with distinct color, size, weight, and slip factor
- **Collection album** with owned counts and hidden-toy teasers
- **9 achievements** (first catch, one-shot, 3-streak, lucky roll, no-minimap win…)
- Persistent coin wallet with **daily login bonus**, win rewards, and bankruptcy relief
- Local stats: attempts, wins, fastest time, recent rounds

### Controls & camera
- Virtual joystick (fixed or **follow-finger** mode), keyboard, left-handed layout
- Four-way camera snap + one-tap **front / side / top** presets
- Auto cinematic camera (coin close-up, carry follow) — can be disabled
- Precision slowdown near catchable toys (toggleable)
- Machine **shake** (once per game) to loosen stuck toys

### Extras
- **Photo mode**: hide the UI, frame your shot, export PNG
- **Share card**: canvas-rendered result card download
- Real-time top-down minimap, onboarding tutorial, zh/en i18n
- Auto-pause in background tabs; coin refund if the page closes mid-grab

### Performance
- Toys rendered via `instancedMesh` (per-instance color) — 4 draw calls for all toys
- Expensive shaders (aurora dome, raymarched nebula floor) render into small offscreen targets at reduced refresh rates
- Minimap second pass throttled to every 3rd frame and blitted from a cached texture
- Shadow map freezing when the scene is static, 4 lights total, quality tiers (High / Smooth)
- Vendor chunk splitting (three / rapier / react) for long-term caching

## Tech Stack

| Category | Technology | Version |
| --- | --- | --- |
| UI framework | React + React DOM | ^19.2 |
| 3D rendering | Three.js | ^0.185 |
| React 3D bindings | @react-three/fiber | ^9.7 |
| Physics | @react-three/rapier (Rapier) | ^2.2 |
| 3D helpers | @react-three/drei | ^10.7 |
| State | Zustand | ^5.0 |
| Build | Vite | ^5.4 |
| Types | TypeScript | ^5.6 |

## Getting Started

```bash
# Node.js >= 18
npm install
npm run dev        # dev server (LAN access enabled)
npm run typecheck  # tsc -b
npm run build      # production build to dist/
npm run preview    # preview the dist build
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages. `vite.config.ts` sets `base: '/claw3d/'` for production; adjust `repoName` if you fork under a different repository name.

## Project Structure

```
src/
├── config/gameConfig.ts   # All tunables: physics, claw, grip/slip, toy types, timing, storage keys
├── store/
│   ├── gameStore.ts       # Zustand store: game state machine, wallet, progress, achievements
│   ├── refs.ts            # Per-frame hot data (claw position, phases) bypassing React state
│   └── persistence.ts     # localStorage helpers
├── game/                  # 3D scene: Machine, Claw, Toys (instanced), GrabController,
│                          # CameraRig, MinimapRenderer, Stage (shaders), AimAssist
├── ui/                    # HUD, joystick, modals, settings, album, photo bar
├── audio/soundManager.ts  # WebAudio synth SFX + music loop
├── i18n/                  # zh / en dictionaries
└── utils/                 # capability detection, share card renderer
```

## Tuning

Difficulty and feel are data-driven in `src/config/gameConfig.ts`:

- `GRIP` — slip probability model (base, eccentricity weight, swing hazard, pity threshold)
- `TOY_TYPES` — rarity table: spawn weight, scale, density, slip factor, star reward
- `TIMING` — every phase duration of the grab cycle
- `DIFFICULTY` — claw speed, sensor radius, toy layout per difficulty

## License

MIT
