import { body, param, query } from "express-validator"
import { validateRequest } from "../../middleware/validateRequest.js"

const validateCreateRating = [
  body("roomId").isMongoId().withMessage("Invalid roomId"),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be 1-5"),
  body("review").optional().isString(),
  validateRequest
]

const validateUpdateRating = [
  param("id").isMongoId().withMessage("Invalid rating ID"),
  body("rating").optional().isInt({ min: 1, max: 5 }),
  body("review").optional().isString(),
  validateRequest
]

const validateGetRatings = [
  query("roomId").optional().isMongoId(),
  query("propertyId").optional().isMongoId(),
  query("userId").optional().isMongoId(),
  query("minRating").optional().isInt({ min: 1, max: 5 }),
  query("maxRating").optional().isInt({ min: 1, max: 5 }),
  query("startDate").optional().isISO8601(),
  query("endDate").optional().isISO8601(),
  query("sortBy").optional().isString(),
  query("sortOrder").optional().isIn(["asc", "desc"]),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1 }),
  validateRequest
]

export default {
  validateCreateRating,
  validateUpdateRating,
  validateGetRatings
}
