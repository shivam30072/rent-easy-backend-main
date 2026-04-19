import { createObjectCsvWriter } from 'csv-writer'
import path from 'path'
import os from 'os'

export const exportToCSV = async ({ headers, records, filename }) => {
  const filePath = path.join(os.tmpdir(), filename)
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: headers.map(h => ({id: h.id, title: h.title}))
  })
  await csvWriter.writeRecords(records)
  return filePath
}
