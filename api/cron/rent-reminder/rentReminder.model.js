import { mongoose } from "../../helper/index.js"

const rentReminderSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rentDueDate: { type: Date, required: true },
    message: { type: String },
    isSent: { type: Boolean, default: false }
  },
  { timestamps: true }
)

export default mongoose.model("RentReminder", rentReminderSchema)

