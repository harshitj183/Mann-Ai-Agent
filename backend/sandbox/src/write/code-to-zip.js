import archiver from 'archiver'
import { Readable } from 'stream'

/**
 * Pack a map of filename → content into a ZIP buffer.
 *
 * @param {Record<string, string | Buffer>} files
 *   e.g. { 'index.js': '...', 'README.md': '...' }
 * @param {object} [options]
 * @param {number} [options.level] - Compression level 0–9 (default 6).
 * @returns {Promise<Buffer>} ZIP bytes.
 */
export async function codeToZip(files, options = {}) {
  const { level = 6 } = options

  if (!files || typeof files !== 'object' || Array.isArray(files)) {
    throw new Error('files must be a plain object mapping filename → content')
  }

  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level } })
    const chunks  = []

    archive.on('data',    chunk => chunks.push(chunk))
    archive.on('end',     ()    => resolve(Buffer.concat(chunks)))
    archive.on('warning', err   => { if (err.code !== 'ENOENT') reject(err) })
    archive.on('error',   err   => reject(err))

    for (const [filename, content] of Object.entries(files)) {
      if (typeof filename !== 'string' || !filename.trim()) {
        reject(new Error('Each key in files must be a non-empty string filename'))
        return
      }

      const contentBuffer = Buffer.isBuffer(content)
        ? content
        : Buffer.from(typeof content === 'string' ? content : JSON.stringify(content))

      const readable = Readable.from(contentBuffer)
      archive.append(readable, { name: filename.trim() })
    }

    archive.finalize()
  })
}
