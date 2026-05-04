const DAYS_IN_FIXED_MONTH = 30

function daysBetween(a, b) {
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function daysOccupiedInExitMonth(agreement, exitDate) {
  const exit = new Date(exitDate)
  const monthStart = new Date(exit.getFullYear(), exit.getMonth(), 1)
  const occupancyStart = new Date(agreement.agreementStartDate) > monthStart
    ? new Date(agreement.agreementStartDate)
    : monthStart
  return Math.max(0, daysBetween(occupancyStart, exit) + 1)
}

export function requiredNoticeDays(agreement) {
  // Notice period scales with the deposit-in-months the tenant paid up front.
  // 1 month deposit -> 30 days, 2 months -> 60 days, 3 months -> 90 days, etc.
  const months = Math.max(1, Math.round(agreement.securityDeposit / agreement.rentAmount))
  return months * DAYS_IN_FIXED_MONTH
}

export function computeSettlement({ agreement, unpaidRentTotal = 0, damageTotal = 0, now = new Date(), ownerInitiated = false }) {
  const dailyRent = agreement.rentAmount / DAYS_IN_FIXED_MONTH
  const noticeRequired = requiredNoticeDays(agreement)

  let daysOfNotice = 0
  if (agreement.leaveNotice) {
    daysOfNotice = daysBetween(agreement.leaveNotice.submittedAt, agreement.leaveNotice.intendedExitDate)
  }

  let noticePenalty = 0
  if (!ownerInitiated) {
    const shortfall = Math.max(0, noticeRequired - daysOfNotice)
    noticePenalty = dailyRent * shortfall
  }

  const exitDate = agreement.leaveNotice?.intendedExitDate || now
  const proratedFinalRent = dailyRent * daysOccupiedInExitMonth(agreement, exitDate)

  const netRefund = agreement.securityDeposit - noticePenalty - unpaidRentTotal - proratedFinalRent - damageTotal

  return {
    noticePenalty,
    proratedFinalRent,
    unpaidRentTotal,
    damageTotal,
    netRefund,
    daysOfNotice: ownerInitiated ? null : daysOfNotice,
    requiredNoticeDays: noticeRequired,
  }
}
