import Room from "../../resources/Room/Room.Model.js"
import RentReminder from "./rentReminder.model.js"
import { isRentDueWithinDays } from "../../helper/index.js"

export const createRentReminderForRoom = async (daysBeforeDue) => {
  const rooms = await Room.find().lean()

  for (const room of rooms) {
    if (isRentDueWithinDays(room.rentDueDay, daysBeforeDue)) {
      await RentReminder.create({
        roomId: room._id,
        message: `Your rent is due in ${daysBeforeDue} days.`,
        createdAt: new Date()
      })
    }
  }
}
