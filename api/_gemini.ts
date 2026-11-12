import { GoogleGenAI } from '@google/genai'
import { cleanDescription } from '../src/utils/expenseInput.js'

export type ApiCategory = {
  id: number
  name: string
  spendingType: 'variable' | 'fixed' | 'planned'
}

export function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  return new GoogleGenAI({ apiKey, httpOptions: { timeout: 20000, retryOptions: { attempts: 1 } } })
}

export function getGeminiModel() {
  return process.env.GEMINI_MODEL || 'gemini-3.6-flash'
}

export function categoryPrompt(categories: ApiCategory[]) {
  return categories
    .map(
      (category) =>
        `- id=${category.id}, name="${category.name}", type=${category.spendingType}`,
    )
    .join('\n')
}

export const transactionSchema = {
  type: 'object',
  properties: {
    date: { type: 'string' },
    description: { type: 'string' },
    merchant: { type: 'string' },
    amount: { type: 'number' },
    categoryId: { type: 'integer' },
    confidence: { type: 'number' },
  },
  required: [
    'date',
    'description',
    'merchant',
    'amount',
    'categoryId',
    'confidence',
  ],
} as const

export const transactionArraySchema = {
  type: 'object',
  properties: {
    transactions: {
      type: 'array',
      items: transactionSchema,
    },
  },
  required: ['transactions'],
} as const

export async function generateExpense(parameters: Parameters<ReturnType<typeof getGemini>['models']['generateContent']>[0]) {
  const ai = getGemini()
  try { return await ai.models.generateContent(parameters) }
  catch (error) {
    const status = Number((error as { status?: number })?.status)
    // Do not burn more quota by repeatedly retrying 429 responses.
    if (![500, 502, 503, 504].includes(status)) throw error
    await new Promise(resolve => setTimeout(resolve, 800))
    return ai.models.generateContent(parameters)
  }
}

export function aiError(error: unknown) {
  const status = Number((error as { status?: number })?.status)
  if (status === 429) return { status: 429, error: 'AI usage limit reached. Wait before trying again. If it continues, check your Google AI Studio quota and billing.', retryAfter: 60 }
  if ([401, 403].includes(status)) return { status: 502, error: 'AI access was denied. Check the API key and project permissions.' }
  if (status === 404) return { status: 502, error: 'The configured AI model is unavailable. Check GEMINI_MODEL in Vercel.' }
  if (status === 400) return { status: 400, error: 'AI could not read this request. Try a shorter entry or a clear JPG/PNG image.' }
  return { status: 503, error: 'AI is temporarily unavailable or returned an unreadable result. Please try again or enter the expense manually.' }
}

export function normalizeTransaction(value: unknown, categories: ApiCategory[], today: string) {
  if (!value || typeof value !== 'object') throw new Error('Invalid AI result')
  const item = value as Record<string, unknown>
  const amount = Number(item.amount)
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount))) throw new Error('Invalid expense amount')
  const merchant = typeof item.merchant === 'string' ? item.merchant.trim() : ''
  const description = cleanDescription(typeof item.description === 'string' ? item.description : '', merchant, amount)
  const candidateDate = typeof item.date === 'string' ? item.date : ''
  const parsedDate = new Date(`${candidateDate}T00:00:00Z`)
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(candidateDate) && !isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === candidateDate
  const fallback = categories.find(c => c.name.toUpperCase() === 'ETC') ?? categories[0]
  return { date: validDate ? candidateDate : today, merchant, description, amount: Math.round(amount),
    categoryId: categories.some(c => c.id === item.categoryId) ? item.categoryId as number : fallback.id,
    confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0)) }
}
