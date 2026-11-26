import puppeteer from 'puppeteer-core'

// In the Docker container, Chromium is installed at a fixed path.
// Locally, set CHROMIUM_PATH in .env to your local Chrome/Chromium binary.
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser'

/**
 * Render an HTML string to a PDF buffer.
 *
 * @param {string} html       - Full HTML document string.
 * @param {object} [options]
 * @param {string} [options.format]      - Paper format, e.g. 'A4' (default).
 * @param {boolean} [options.landscape]  - Landscape orientation.
 * @param {object} [options.margin]      - { top, right, bottom, left } in CSS units.
 * @returns {Promise<Buffer>}  PDF bytes.
 */
export async function htmlToPdf(html, options = {}) {
  const {
    format    = 'A4',
    landscape = false,
    margin    = { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
  } = options

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
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      format,
      landscape,
      margin,
      printBackground: true,
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
