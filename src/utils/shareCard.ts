/** 결과 공유 카드(PNG data URL)를 2D 캔버스로 그립니다 */
const CARD_FONT = "'Jua', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', system-ui, sans-serif"

export function createShareCard(opts: {
  title: string
  toyLine: string
  statLine: string
  footer: string
}): string {
  const w = 640
  const h = 360
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, w, h)
  grad.addColorStop(0, '#2b1a5e')
  grad.addColorStop(1, '#0c0722')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(255, 201, 60, 0.7)'
  ctx.lineWidth = 4
  ctx.strokeRect(10, 10, w - 20, h - 20)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffc93c'
  ctx.font = `bold 40px ${CARD_FONT}`
  ctx.fillText('🎉 ' + opts.title, w / 2, 92)
  ctx.font = `64px ${CARD_FONT}`
  ctx.fillText('🧸', w / 2, 175)
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold 26px ${CARD_FONT}`
  ctx.fillText(opts.toyLine, w / 2, 225)
  ctx.fillStyle = '#cfc6ec'
  ctx.font = `20px ${CARD_FONT}`
  ctx.fillText(opts.statLine, w / 2, 265)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = `15px ${CARD_FONT}`
  ctx.fillText(opts.footer, w / 2, 320)
  return c.toDataURL('image/png')
}

export function downloadDataUrl(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}
