import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  categoryPrompt,
  generateExpense, aiError, normalizeTransaction,
  getGeminiModel,
  transactionSchema,
  type ApiCategory,
} from './_gemini.js'

type RequestBody = {
  text?: string
  today?: string
  categories?: ApiCategory[]
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const body = request.body as RequestBody
    const text = body.text?.trim()
    const today = body.today || new Date().toISOString().slice(0, 10)
    const categories = Array.isArray(body.categories) ? body.categories : []

    if (!text || categories.length === 0) {
      response.status(400).json({ error: 'text and categories are required' })
      return
    }

    const prompt = `
You are an expense parser for a private Korean personal-finance app.

Today's local date is ${today}.
Parse ONE expense from the user's text.

Rules:
- amount must be a positive KRW number without commas.
- If the user says today/오늘, use ${today}.
- Infer relative dates such as yesterday/어제 from ${today}.
- If no date is mentioned, use ${today}.
- description must contain only the purchased item/service, excluding the merchant, price and date. Never copy the entire input.
- Preserve the original language of item and merchant names. Example: 맥도날드 베토디 세트 8100 -> merchant="맥도날드", description="베토디 세트", amount=8100.
- If only the merchant and price are provided, use description="Purchase"; do not invent a product.
- merchant should be the merchant/store/service name if available, otherwise "".
- categoryId MUST be one of the category ids listed below.
- Pick the user's most semantically appropriate category. Do not invent a category.
- confidence must be a number from 0 to 1.

Categories:
${categoryPrompt(categories)}

User text:
${text}
`.trim()

    const result = await generateExpense({
      model: getGeminiModel(),
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: transactionSchema,
      },
    })

    const parsed = normalizeTransaction(JSON.parse(result.text || '{}'), categories, today)

    response.status(200).json(parsed)
  } catch (error) {
    const failure = aiError(error)
    console.error('Expense AI failed', failure.status)
    if (failure.retryAfter) response.setHeader('Retry-After', failure.retryAfter)
    response.status(failure.status).json(failure)
  }
}
