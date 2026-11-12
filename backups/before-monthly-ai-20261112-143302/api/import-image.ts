import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  categoryPrompt,
  getGemini,
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

    const ai = getGemini()
    const prompt = `
You are reading a screenshot of card/bank payment history for a private Korean personal-finance app.
Today's local date is ${today}.

Extract expense transactions visible in the screenshot.

Rules:
- Ignore balances, available credit, reward points, totals, refunds, deposits, and non-transaction UI text.
- Only return actual expense/payment rows.
- amount must be a positive KRW number.
- Resolve dates to YYYY-MM-DD. When the screenshot omits a year, use the year that best matches ${today}.
- description should be a short useful label.
- merchant should contain the merchant/store/service name when visible, otherwise "".
- categoryId MUST be one of the ids below. Never invent categories.
- confidence must be 0 to 1.
- If the same transaction appears twice due to scrolling overlap, return it once.

Categories:
${categoryPrompt(categories)}
`.trim()

    const result = await ai.models.generateContent({
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

    const parsed = JSON.parse(result.text || '{"transactions":[]}')
    const allowedIds = new Set(categories.map((category) => category.id))

    const transactions = Array.isArray(parsed.transactions)
      ? parsed.transactions.map((item: any) => ({
          ...item,
          categoryId: allowedIds.has(item.categoryId)
            ? item.categoryId
            : categories[0].id,
        }))
      : []

    response.status(200).json({ transactions })
  } catch (error) {
    console.error(error)
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown AI error',
    })
  }
}
