import { useEffect } from 'react'

/**
 * 투네이션 홈(index.html)의 '투네 랜드' 영역처럼 iframe 안에 들어가 있을 때의 처리
 *
 * - 로비(채널 선택)는 내용 높이만큼 iframe을 늘리도록 부모에게 알려, 게임 안쪽 스크롤 없이
 *   부모 페이지 스크롤 하나로 보이게 합니다. 게임 중에는 부모의 기본 높이로 돌아갑니다.
 * - 부모가 알려 주는 "화면에 실제로 보이는 구간"을 CSS 변수(--embed-top, --embed-h)로 두어
 *   팝업 · 안내 문구가 iframe 전체가 아닌 보이는 화면 가운데에 뜨게 합니다.
 *
 * 부모와는 postMessage로만 주고받아, 다른 도메인에 넣어도 동작합니다.
 */
export const EMBED_MSG = {
  /** 게임 → 부모: 원하는 iframe 높이(px). null이면 부모 기본 높이 */
  height: 'toonaland:height',
  /** 부모 → 게임: iframe 중 화면에 보이는 구간 */
  viewport: 'toonaland:viewport',
} as const

export const isEmbedded = (() => {
  try {
    return window.self !== window.top
  } catch {
    // 다른 도메인의 부모에 접근하면 예외가 나므로, 이 경우도 iframe 안으로 봅니다
    return true
  }
})()

export function useEmbedFrame(inLobby: boolean) {
  // 부모가 보내 주는 보이는 구간 → CSS 변수
  useEffect(() => {
    if (!isEmbedded) return
    const root = document.documentElement
    root.classList.add('embedded')
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.parent) return
      const data = e.data as { type?: string; top?: number; height?: number } | null
      if (data?.type !== EMBED_MSG.viewport) return
      if (typeof data.top !== 'number' || typeof data.height !== 'number') return
      root.style.setProperty('--embed-top', `${Math.max(0, data.top)}px`)
      root.style.setProperty('--embed-h', `${Math.max(0, data.height)}px`)
    }
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
      root.classList.remove('embedded')
    }
  }, [])

  // 로비 내용 높이를 부모에게 전달
  useEffect(() => {
    if (!isEmbedded) return
    const post = (height: number | null) => window.parent.postMessage({ type: EMBED_MSG.height, height }, '*')
    if (!inLobby) {
      post(null)
      return
    }
    let observer: ResizeObserver | null = null
    let raf = 0
    const measure = () => {
      const lobby = document.querySelector<HTMLElement>('.lobby')
      const inner = lobby?.querySelector<HTMLElement>('.lobby-inner')
      if (!lobby || !inner) return false
      const cs = getComputedStyle(lobby)
      post(Math.ceil(inner.offsetHeight + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)))
      return true
    }
    // 로비가 그려진 다음 프레임부터 크기 변화를 지켜봄
    const attach = () => {
      const inner = document.querySelector<HTMLElement>('.lobby .lobby-inner')
      if (!inner) {
        raf = requestAnimationFrame(attach)
        return
      }
      measure()
      observer = new ResizeObserver(() => measure())
      observer.observe(inner)
    }
    attach()
    return () => {
      cancelAnimationFrame(raf)
      observer?.disconnect()
    }
  }, [inLobby])
}
