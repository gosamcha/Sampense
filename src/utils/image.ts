export async function imageFileToDataUrl(file: File, maxSide = 1600) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files can be uploaded')
  }
  if (file.size > 20 * 1024 * 1024) throw new Error('Please choose an image smaller than 20 MB.')

  const sourceUrl = URL.createObjectURL(file)

  try {
    const image = new Image()
    image.src = sourceUrl
    try { await image.decode() } catch { throw new Error('This image format could not be opened. Please use a JPG, PNG or WebP screenshot.') }

    const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not prepare image')

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)
    for (const quality of [0.84, 0.7, 0.55]) {
      const encoded = canvas.toDataURL('image/jpeg', quality)
      if (encoded.length < 3_500_000) return encoded
    }
    throw new Error('This image is too large. Crop it to the payment details and try again.')
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}
