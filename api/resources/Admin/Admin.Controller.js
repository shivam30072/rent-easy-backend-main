import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const reseedDummies = async (req, res) => {
  // Run scripts/seed-test-partner-data.js as a child process
  const scriptPath = path.resolve(__dirname, '../../../scripts/seed-test-partner-data.js')
  const child = spawn(process.execPath, [scriptPath], { cwd: path.resolve(__dirname, '../../..') })

  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (d) => { stdout += d.toString() })
  child.stderr.on('data', (d) => { stderr += d.toString() })

  child.on('close', (code) => {
    if (code === 0) {
      return res.success(200, 'Dummy data re-seeded.', { stdout, stderr })
    }
    return res.error(500, 'Reseed failed.', { stdout, stderr, code })
  })
}

const AdminController = { reseedDummies }
export default AdminController
