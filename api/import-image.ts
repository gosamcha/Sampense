import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  categoryPrompt,
  generateExpense, aiError, normalizeTransaction,
  getGeminiModel,
  transactionArraySchema,
  type ApiCategory,
} from './_gemini.js'

type RequestBody = {
  imageDataUrl?: string
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
    const imageDataUrl = body.imageDataUrl
    const today = body.today || new Date().toISOString().slice(0, 10)
    const categories = Array.isArray(body.categories) ? body.categories : []

    if (!imageDataUrl || categories.length === 0) {
      response
        .status(400)
        .json({ error: 'imageDataUrl and categories are required' })
      return
    }

    const match = imageDataUrl.match(/^data:(image\/[\w.+-]+);base64,(.+)$/)
    if (!match) {
      response.status(400).json({ error: 'Invalid image data URL' })
      return
    }

    const [, mimeType, data] = match
    if (data.length > 4_000_000) {
      response.status(413).json({ error: 'Image is too large' })
      return
    }

    const prompt = `
You are reading a screenshot of card/bank payment history for a private Korean personal-finance app.
Today's local date is ${today}.

Extract expense transactions visible in the screenshot.

Rules:
- Ignore balances, available credit, reward points, totals, refunds, deposits, and non-transaction UI text.
- Only return actual expense/payment rows.
- amount must be a positive KRW number.
- Resolve dates to YYYY-MM-DD. When the screenshot omits a year, use the year that best matches ${today}.
- description must contain only the purchased item/service, excluding the merchant, amount and date. Preserve the original language.
- If no product is visible, use description="Purchase". Do not invent items or duplicate the merchant name.
- merchant should contain the merchant/store/service name when visible, otherwise "".
- categoryId MUST be one of the ids below. Never invent categories.
- confidence must be 0 to 1.
- If the same transaction appears twice due to scrolling overlap, return it once.

Categories:
${categoryPrompt(categories)}
`.trim()

    const result = await generateExpense({
      model: getGeminiModel(),
      contents: [
        {
          inlineData: {
            mimeType,
            data,
          },
        },
        { text: prompt },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: transactionArraySchema,
      },
    })

    const parsed = JSON.parse(result.text || '{}')
    if (!Array.isArray(parsed.transactions)) throw new Error('Invalid image result')
    const transactions = parsed.transactions.map((item: unknown) => normalizeTransaction(item, categories, today))

    response.status(200).json({ transactions })
  } catch (error) {
    const failure = aiError(error)
    console.error('Image AI failed', failure.status)
    if (failure.retryAfter) response.setHeader('Retry-After', failure.retryAfter)
    response.status(failure.status).json(failure)
  }
}
