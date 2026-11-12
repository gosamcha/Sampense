let retryAt = 0
export async function requestAi<T>(path: string, body: unknown): Promise<T> {
  if (Date.now() < retryAt) throw new Error(`AI usage limit reached. Try again in ${Math.ceil((retryAt - Date.now()) / 1000)} seconds, or enter the expense manually.`)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 50000)
  try {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal })
    const text = await response.text()
    let result
    try { result = JSON.parse(text) } catch { throw new Error(response.status === 413 ? 'This image is too large. Crop it and try again.' : 'AI did not respond correctly. Try again or enter the expense manually.') }
    if (response.status === 429) {
      const seconds = Number(response.headers.get('Retry-After')) || 60
      retryAt = Date.now() + Math.max(1, seconds) * 1000
    }
    if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'AI request failed. Please try again.')
    return result as T
  } catch (error) {
    if (controller.signal.aborted) throw new Error('AI took too long to respond. Please try again or enter the expense manually.')
    if (error instanceof TypeError) throw new Error('Could not reach AI. Check your internet connection and try again.')
    throw error
  } finally { clearTimeout(timer) }
}
