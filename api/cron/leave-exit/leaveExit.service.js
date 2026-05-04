import { rentalAgreementModel } from "../../resources/RentalAgreement/RentalAgreement.Schema.js";
import RentalAgreementModel from "../../resources/RentalAgreement/RentalAgreement.Model.js";
import { NotificationModel } from "../../resources/Notification/Notification.Model.js";

export async function processExitDateReached(now = new Date()) {
  // 1. Terminate agreements whose intendedExitDate has arrived
  // DEBUG: dump every active agreement that has a leaveNotice, regardless of date.
  const allWithNotice = await rentalAgreementModel
    .find({ status: "active", leaveNotice: { $ne: null } })
    .select("_id status leaveNotice")
    .lean();
  console.log(`[leave-exit DEBUG] now=${now.toISOString()}`);
  console.log(`[leave-exit DEBUG] active agreements with leaveNotice: ${allWithNotice.length}`);
  for (const a of allWithNotice) {
    const exit = a.leaveNotice?.intendedExitDate;
    console.log(`  - ${a._id} status=${a.status} intendedExitDate=${exit?.toISOString?.() || exit} (<=now? ${exit && new Date(exit) <= now})`);
  }

  const agreementsToExit = await rentalAgreementModel
    .find({
      status: "active",
      "leaveNotice.intendedExitDate": { $lte: now },
    })
    .select("_id userId ownerId")
    .lean();
  console.log(`[leave-exit DEBUG] query matched ${agreementsToExit.length} agreements`);

  let terminated = 0;
  for (const a of agreementsToExit) {
    try {
      await RentalAgreementModel.terminateRentalAgreement(
        a._id,
        "Auto-terminated on intended exit date",
        null,
      );
      terminated += 1;
    } catch (err) {
      console.error(`[leave-exit] terminate failed for ${a._id}:`, err.message);
    }
  }

  // 2. Send "deadline approaching" notifications to owners whose deadline is tomorrow
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const settlementsApproachingDeadline = await rentalAgreementModel
    .find({
      "settlement.status": "pending_owner",
      "settlement.ownerActionDeadline": {
        $gte: tomorrowStart,
        $lte: tomorrowEnd,
      },
    })
    .select("_id ownerId settlement.netRefund")
    .lean();

  let reminded = 0;
  for (const a of settlementsApproachingDeadline) {
    try {
      await NotificationModel.createNotification({
        userId: a.ownerId,
        type: "settlement_deadline_approaching",
        message:
          "Settlement deadline is tomorrow. Mark refund paid or add damages today to avoid a reputation penalty.",
        meta: { agreementId: a._id, netRefund: a.settlement?.netRefund },
        triggeredAt: new Date(),
      });
      reminded += 1;
    } catch (err) {
      console.error(`[leave-exit] reminder failed for ${a._id}:`, err.message);
    }
  }

  return { terminated, reminded };
}
