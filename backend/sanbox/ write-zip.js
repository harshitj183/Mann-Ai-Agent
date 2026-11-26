import archiver from 'archiver'
import { Readable } from 'stream'

/**
 * input: { files: Array<{ name: string, content: string }> }
 */
export async function writeModeZIP(input) {
  const { files } = input

  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('input.files must be a non-empty array of { name, content }')
  }

  return new Promise((resolve, reject) => {
    const chunks  = []
    const archive = archiver('zip', { zlib: { level: 9 } })

    archive.on('data',    chunk  => chunks.push(chunk))
    archive.on('end',     ()     => resolve({
      buffer:   Buffer.concat(chunks),
      mimeType: 'application/zip',
      filename: 'output.zip',
    }))
    archive.on('error',   err    => reject(err))

    for (const file of files) {
      if (!file.name || file.content === undefined) {
        return reject(new Error('Each file must have { name, content }'))
      }
      archive.append(file.content, { name: file.name })
    }

    archive.finalize()
  })
}
