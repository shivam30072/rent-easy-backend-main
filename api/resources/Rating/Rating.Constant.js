export const RATING_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

export const RATING_FILTERS = {
  DATE_FROM: 'dateFrom',  // Start date for filtering
  DATE_TO: 'dateTo',      // End date for filtering
  STATUS: 'status',       // Rating status
  PROPERTY_ID: 'propertyId' // Property filter
}

export const RATING_EXPORT_FILE_NAME = 'ratings_export.xlsx'

export const RATING_EXCEL_HEADERS = [
  { header: 'Rating ID', key: '_id', width: 25 },
  { header: 'Property Name', key: 'propertyName', width: 30 },
  { header: 'User Name', key: 'userName', width: 25 },
  { header: 'Rating', key: 'rating', width: 10 },
  { header: 'Review', key: 'review', width: 50 },
  { header: 'Status', key: 'status', width: 15 },
  { header: 'Created At', key: 'createdAt', width: 20 },
  { header: 'Updated At', key: 'updatedAt', width: 20 }
]
