// pdf-parse is CJS — the default import works with ESM via Node's interop.
import pdfParse from 'pdf-parse/lib/pdf-parse.js'

/**
 * Extract plain text from a PDF buffer.
 *
 * @param {Buffer} buffer - PDF file bytes.
 * @returns {Promise<{ text: string, pages: number }>}
 */
export async function parsePdf(buffer) {
  if (!Buffer.isBuffer(buffer) && !buffer?.buffer) {
    throw new Error('Input must be a Buffer containing PDF bytes')
  }

  const data = await pdfParse(buffer)
  return {
    text:  data.text,
    pages: data.numpages,
  }
}
