export async function imageFileToDataUrl(file: File, maxSide = 1600) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files can be uploaded')
  }

  const sourceUrl = URL.createObjectURL(file)

  try {
    const image = new Image()
    image.src = sourceUrl
    await image.decode()

    const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not prepare image')

    context.drawImage(image, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', 0.84)
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}
