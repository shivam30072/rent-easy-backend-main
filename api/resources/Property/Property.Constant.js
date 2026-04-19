export const PROPERTY_MESSAGES = {
  CREATED: 'Property created',
  UPDATED: 'Property updated',
  DELETED: 'Property deleted',
  RESTORED: 'Property restored',
  ARCHIVED: 'Property archived',
  TOGGLED: 'Property status toggled',
  ALL: 'Properties fetched',
  NOT_FOUND: 'Property not found',
  OWNER_NOT_FOUND: 'Owner not found. Cannot create property without a valid owner',
  CREATE_FAILED: 'Failed to create property',
  OWNER_UPDATE_FAILED: 'Property created but failed to link with owner',
  CODE_EXISTS: 'uniquePropertyCode already exists',
  CODE_AVAILABLE: 'uniquePropertyCode is available',
  STATS: 'Property stats fetched',
  RATING_RECOMPUTED: 'Property rating recomputed',
  IMAGE_ADDED: 'Image added',
  IMAGE_REMOVED: 'Image removed',
  BULK_UPDATED: 'Bulk update done',
  VALIDATION_ERROR: 'Validation error',
  SIMILAR_FETCHED: 'Similar properties fetched',
  SIMILAR_FALLBACK_USED: 'Similar properties fetched (fallback applied)',
  AUTO_COMPLETE: 'Auto complete property search results.',
  SEARCH_PROPERTY: 'Property searched successfully!',
  ALL_OWNER_PROPERTIES: 'Fetched owner properties successfully!',
  GET_PROPERTY_BY_CODE: 'Get property by code successfully!',
  GET_PROPERTY_BY_ID_SUCCESSFULLY: 'Get property by id successfully!'
}

export const PROPERTY_ENUMS = {
  PROPERTY_TYPES: ["flat", "villa", "independent_house", "other"],
  FURNISHING: ['unfurnished', 'semi-furnished', 'fully-furnished'],
  SORTABLE_FIELDS: [
    'createdAt','updatedAt','rating','minAmount','maxAmount','size','floor','totalFloors'
  ],
}

export const PROPERTY_SIMILAR_WEIGHTS = {
  type: 0.25,        // exact propertyType match
  price: 0.25,       // mid-rent proximity
  bhk: 0.15,         // bhkType match
  furnishing: 0.10,  // furnishing affinity
  features: 0.15,    // Jaccard overlap
  distance: 0.05,    // geo/city/locality proximity
  rating: 0.05       // rating closeness
}

export const BULK_UPLOAD_MESSAGES = {
  SAMPLE_GENERATED: 'Sample Excel downloaded',
  UPLOAD_SUCCESS: 'Bulk upload completed',
  NO_FILE: 'No file uploaded. Please upload an .xlsx file',
  INVALID_FORMAT: 'Only .xlsx files are accepted',
  FILE_TOO_LARGE: 'File exceeds 5MB limit',
  TOO_MANY_ROWS: 'Maximum 200 properties per upload',
  NO_DATA_ROWS: 'No data rows found in the uploaded file',
  S3_UPLOAD_FAILED: 'Failed to store uploaded file',
}

export const BULK_UPLOAD_COLUMNS = [
  { header: 'propertyName', key: 'propertyName', width: 25, required: true, example: 'Sunrise Apartments' },
  { header: 'propertyType', key: 'propertyType', width: 18, required: true, example: 'flat', enum: ['flat', 'villa', 'independent_house', 'other'] },
  { header: 'bhkType', key: 'bhkType', width: 10, required: false, example: '2BHK' },
  { header: 'size', key: 'size', width: 10, required: false, example: 1200, type: 'number' },
  { header: 'floor', key: 'floor', width: 8, required: false, example: 3, type: 'number' },
  { header: 'totalFloors', key: 'totalFloors', width: 12, required: false, example: 10, type: 'number' },
  { header: 'availableFrom', key: 'availableFrom', width: 15, required: false, example: '2026-05-01' },
  { header: 'preferredTenant', key: 'preferredTenant', width: 16, required: false, example: 'Family' },
  { header: 'furnishing', key: 'furnishing', width: 16, required: false, example: 'semi-furnished', enum: ['unfurnished', 'semi-furnished', 'fully-furnished'] },
  { header: 'parking', key: 'parking', width: 8, required: false, example: 'true', type: 'boolean' },
  { header: 'features', key: 'features', width: 30, required: false, example: 'AC, Lift, Security' },
  { header: 'highlights', key: 'highlights', width: 30, required: false, example: 'Near Metro, Gated Community' },
  { header: 'description', key: 'description', width: 40, required: false, example: 'Spacious 2BHK flat with great amenities' },
  { header: 'minAmount', key: 'minAmount', width: 12, required: false, example: 15000, type: 'number' },
  { header: 'maxAmount', key: 'maxAmount', width: 12, required: false, example: 20000, type: 'number' },
  { header: 'city', key: 'city', width: 15, required: true, example: 'Bangalore' },
  { header: 'state', key: 'state', width: 15, required: true, example: 'Karnataka' },
  { header: 'pincode', key: 'pincode', width: 10, required: false, example: '560001' },
  { header: 'roomNumber', key: 'roomNumber', width: 12, required: false, example: '101' },
  { header: 'roomType', key: 'roomType', width: 10, required: true, example: 'Flat', enum: ['Single', 'Double', 'Suite', 'Flat', 'Other'] },
  { header: 'rent', key: 'rent', width: 10, required: true, example: 18000, type: 'number' },
  { header: 'rentDueDay', key: 'rentDueDay', width: 12, required: false, example: 5, type: 'number' },
  { header: 'maintenanceCharge', key: 'maintenanceCharge', width: 18, required: false, example: 2000, type: 'number' },
  { header: 'securityDeposit', key: 'securityDeposit', width: 16, required: false, example: 1, type: 'number' },
  { header: 'amenities', key: 'amenities', width: 30, required: false, example: 'WiFi, AC, Geyser' },
]
