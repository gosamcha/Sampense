// Only parse an explicit trailing price; product numbers must not become prices.
export function splitTrailingPrice(text: string) {
  const match = text.trim().match(/^(.*?)\s+(?:₩\s*)?(\d+(?:,\d{3})*)(?:\s*(?:원|KRW))?\s*$/i)
  if (!match) return null
  const amount = Number(match[2].replaceAll(',', ''))
  if (!Number.isSafeInteger(amount) || amount <= 0) return null
  return { label: match[1].trim(), amount }
}

export function cleanDescription(description: string, merchant: string, amount: number) {
  let label = description.trim()
  const price = splitTrailingPrice(label)
  if (price?.amount === amount) label = price.label
  const escaped = merchant.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
  if (escaped) label = label.replace(new RegExp(`^${escaped}(?:\\s+|\\s*[:：·-]\\s*|$)`, 'i'), '').trim()
  return label || 'Purchase'
}

export function parseKnownMerchant(text: string, merchantKey: string) {
  const price = splitTrailingPrice(text)
  if (!price) return null
  const escaped = merchantKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
  const match = price.label.match(new RegExp(`^(${escaped})(?:\\s+|$)`, 'i'))
  if (!match) return null
  return { merchant: match[1], description: cleanDescription(price.label, match[1], price.amount), amount: price.amount }
}
