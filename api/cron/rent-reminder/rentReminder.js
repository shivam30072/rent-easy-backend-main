import cron from "node-cron"
import { createRentReminderForRoom } from "./rentReminder.service.js"

const DAYS_BEFORE_DUE = 3 // X days before rentDueDay

// Run every day at 9:00 AM
cron.schedule("0 9 * * *", async () => {
  console.log(`[CRON] Rent reminder check started at ${new Date().toISOString()}`)
  
  try {
    await createRentReminderForRoom(DAYS_BEFORE_DUE)
    console.log(`[CRON] Rent reminder check completed successfully`)
  } catch (error) {
    console.error(`[CRON] Error creating rent reminders:`, error)
  }
})
