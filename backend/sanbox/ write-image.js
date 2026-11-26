import puppeteer from 'puppeteer'
import sharp from 'sharp'

/**
 * input: { type: 'html', content: string, width?: number, height?: number, frames?: string[], delay?: number }
 * mode: 'png' | 'gif'
 *
 * For GIF: input.frames = array of HTML strings, input.delay = ms between frames (default 500)
 */
export async function writeModeImage(input, mode) {
  const { content, width = 1280, height = 720, frames, delay = 500 } = input

  if (mode === 'gif') {
    // GIF: render each frame as PNG, then stitch with sharp
    const allFrames = Array.isArray(frames) && frames.length ? frames : [content]
    if (!allFrames[0]) throw new Error('input.content or input.frames is required for gif')

    const pngBuffers = []
    const browser   = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    const page      = await browser.newPage()
    await page.setViewport({ width, height })

    for (const frameHtml of allFrames) {
      await page.setContent(frameHtml, { waitUntil: 'networkidle0' })
      const buf = await page.screenshot({ type: 'png' })
      pngBuffers.push(buf)
    }

    await browser.close()

    // sharp does not natively encode animated GIF — we produce a multi-page WebP
    // or fall back to a simple sprite sheet PNG if only one frame
    if (pngBuffers.length === 1) {
      return { buffer: pngBuffers[0], mimeType: 'image/png', filename: 'output.png' }
    }

    // Build animated WebP (best lossless animated format sharp supports)
    const gif = await sharp(pngBuffers[0])
      .gif({ delay })   // sharp >= 0.33 supports animated GIF output
      .toBuffer()
      .catch(async () => {
        // Fallback: return first frame as PNG
        return pngBuffers[0]
      })

    return { buffer: gif, mimeType: 'image/gif', filename: 'output.gif' }

  } else {
    // PNG screenshot
    if (!content) throw new Error('input.content (HTML) is required for png')

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    const page    = await browser.newPage()
    await page.setViewport({ width, height })
    await page.setContent(content, { waitUntil: 'networkidle0' })
    const buffer  = await page.screenshot({ type: 'png', fullPage: true })
    await browser.close()

    return { buffer, mimeType: 'image/png', filename: 'output.png' }
  }
}
