import { parse } from 'csv-parse'

/**
 * Parse a CSV buffer into an array of row objects.
 *
 * @param {Buffer} buffer - CSV file bytes.
 * @param {object} [options]
 * @param {boolean} [options.columns]   - Use first row as column names (default true).
 * @param {string}  [options.delimiter] - Field delimiter (default ',').
 * @returns {Promise<{ rows: object[], count: number }>}
 */
export async function parseCsv(buffer, options = {}) {
  const {
    columns   = true,
    delimiter = ',',
    trim      = true,
    skip_empty_lines = true,
  } = options

  const csv = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer)

  return new Promise((resolve, reject) => {
    parse(csv, { columns, delimiter, trim, skip_empty_lines }, (err, rows) => {
      if (err) return reject(new Error(`CSV parse error: ${err.message}`))
      resolve({ rows, count: rows.length })
    })
  })
}
