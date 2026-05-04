import cron from "node-cron";
import { processExitDateReached } from "./leaveExit.service.js";

// Run daily at 1:00 AM
cron.schedule("0 1 * * *", async () => {
  console.log(`[CRON] leave-exit check started at ${new Date().toISOString()}`);
  try {
    const { terminated, reminded } = await processExitDateReached(new Date());
    console.log(
      `[CRON] leave-exit terminated=${terminated} reminded=${reminded}`,
    );
  } catch (err) {
    console.error("[CRON] leave-exit failed:", err);
  }
});
