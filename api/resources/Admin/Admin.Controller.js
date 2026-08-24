import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import { partnerProfileModel } from '../PartnerProfile/PartnerProfile.Schema.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const reseedDummies = async (req, res) => {
  // Seed dummies around the caller's own location + city, so matches land within
  // radius regardless of where the tester actually is (real device vs emulator).
  const me = await partnerProfileModel.findOne({ userId: req.user._id }).select('location')
  const env = { ...process.env }
  if (me?.location?.gpsCoords?.lat != null && me?.location?.gpsCoords?.lng != null) {
    env.SEED_CENTER_LAT = String(me.location.gpsCoords.lat)
    env.SEED_CENTER_LNG = String(me.location.gpsCoords.lng)
  }
  if (me?.location?.preferredCity) env.SEED_CITY = me.location.preferredCity

  // Run scripts/seed-test-partner-data.js as a child process
  const scriptPath = path.resolve(__dirname, '../../../scripts/seed-test-partner-data.js')
  const child = spawn(process.execPath, [scriptPath], { cwd: path.resolve(__dirname, '../../..'), env })

  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (d) => { stdout += d.toString() })
  child.stderr.on('data', (d) => { stderr += d.toString() })

  child.on('close', async (code) => {
    if (code !== 0) {
      return res.error(500, 'Reseed failed.', { stdout, stderr, code })
    }
    // The seed creates dummies via raw model.create(), which never computes
    // match scores. Clearing the caller's flag makes their next feed load
    // cold-start a recompute against the freshly seeded profiles.
    try {
      await partnerProfileModel.updateOne(
        { userId: req.user._id },
        { $set: { matchScoresComputedAt: null } },
      )
    } catch (err) {
      console.error('[reseedDummies] failed to reset match flag:', err.message)
    }
    return res.success(200, 'Dummy data re-seeded.', { stdout, stderr })
  })
}

const AdminController = { reseedDummies }
export default AdminController
