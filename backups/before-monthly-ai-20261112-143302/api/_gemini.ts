import { GoogleGenAI } from '@google/genai'

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

  return new GoogleGenAI({ apiKey })
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
