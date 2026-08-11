export function formatKRW(amount: number) {
  return `₩ ${Math.round(amount).toLocaleString('ko-KR')}`
}

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

export function hexWithAlpha(hex: string, opacity: number) {
  const clean = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return hex
  const alpha = Math.round(clamp(opacity) * 255)
    .toString(16)
    .padStart(2, '0')
  return `#${clean}${alpha}`
}

export function normalizeMerchant(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}
