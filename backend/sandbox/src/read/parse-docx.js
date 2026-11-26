import mammoth from 'mammoth'

/**
 * Extract plain text from a DOCX buffer.
 *
 * @param {Buffer} buffer - DOCX file bytes.
 * @returns {Promise<{ text: string, messages: object[] }>}
 *   messages contains any warnings emitted by mammoth.
 */
export async function parseDocx(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Input must be a Buffer containing DOCX bytes')
  }

  const result = await mammoth.extractRawText({ buffer })
  return {
    text:     result.value,
    messages: result.messages,
  }
}
