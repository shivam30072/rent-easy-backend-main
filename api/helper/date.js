export const isRentDueWithinDays = (rentDueDay, daysBeforeDue) => {
  const today = new Date()
  const dueDate = new Date(today.getFullYear(), today.getMonth(), rentDueDay)

  // If due date already passed this month, assume next month
  if (dueDate < today) {
    dueDate.setMonth(dueDate.getMonth() + 1)
  }

  const diffTime = dueDate - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays <= daysBeforeDue
}
