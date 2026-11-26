import puppeteer from 'puppeteer-core'
import sharp from 'sharp'

const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser'

/**
 * Render an HTML string to a PNG buffer.
 *
 * @param {string} html
 * @param {object} [options]
 * @param {number} [options.width]   - Viewport width in px (default 1280).
 * @param {number} [options.height]  - Viewport height in px (default 720).
 * @param {'png'|'gif'} [options.format] - Output image format (default 'png').
 * @returns {Promise<Buffer>} Image bytes.
 */
export async function htmlToImage(html, options = {}) {
  const {
    width  = 1280,
    height = 720,
    format = 'png',
  } = options

  if (!['png', 'gif'].includes(format)) {
    throw new Error(`Unsupported format "${format}". Use "png" or "gif".`)
  }

  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width, height })
    await page.setContent(html, { waitUntil: 'networkidle0' })

    // Puppeteer always produces PNG; convert to GIF via sharp if requested.
    const pngBuffer = await page.screenshot({ type: 'png', fullPage: false })

    if (format === 'gif') {
      // Sharp converts PNG → GIF. Static single-frame GIF.
      const gifBuffer = await sharp(pngBuffer)
        .gif()
        .toBuffer()
      return gifBuffer
    }

    return Buffer.from(pngBuffer)
  } finally {
    await browser.close()
  }
}
