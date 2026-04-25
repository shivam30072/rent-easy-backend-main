export const RATING_MESSAGES = {
  CREATED: 'Rating created successfully',
  UPDATED: 'Rating updated successfully',
  DELETED: 'Rating deleted successfully',
  GET_RATINGS: 'Ratings fetched successfully',
  GET_RATING: 'Rating fetched successfully',
  NOT_FOUND: 'Rating not found',
  ROOM_AVERAGE: 'Room average rating fetched',
  PROPERTY_AVERAGE: 'Property average rating fetched'
}

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
