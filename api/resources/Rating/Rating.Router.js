import { express, configureRouter } from "../../helper/index.js"
import RatingController from "./Rating.Controller.js"
import { authMiddleware, requireRole } from "../../middleware/authMiddleware.js"

const {
  createRating,
  getRatings,
  getRatingById,
  updateRating,
  deleteRating,
  getRoomAverage,
  getPropertyAverage
} = RatingController

const config = {
  preMiddlewares: [],
  postMiddlewares: [],
  routesConfig: {
    createRating: {
      method: "post",
      path: "/",
      enabled: true,
      prePipeline: [authMiddleware, requireRole(["tenant"])],
      pipeline: [createRating]
    },
    getRatings: {
      method: "get",
      path: "/",
      enabled: true,
      prePipeline: [authMiddleware],
      pipeline: [getRatings]
    },
    getRatingById: {
      method: "get",
      path: "/:id",
      enabled: true,
      prePipeline: [authMiddleware],
      pipeline: [getRatingById]
    },
    updateRating: {
      method: "patch",
      path: "/:id",
      enabled: true,
      prePipeline: [authMiddleware, requireRole(["tenant"])],
      pipeline: [updateRating]
    },
    deleteRating: {
      method: "delete",
      path: "/:id",
      enabled: true,
      prePipeline: [authMiddleware, requireRole(["tenant", "admin"])],
      pipeline: [deleteRating]
    },
    getRoomAverage: {
      method: "get",
      path: "/room/:roomId/average",
      enabled: true,
      prePipeline: [],
      pipeline: [getRoomAverage]
    },
    getPropertyAverage: {
      method: "get",
      path: "/property/:propertyId/average",
      enabled: true,
      prePipeline: [],
      pipeline: [getPropertyAverage]
    }
  }
}

const RatingRouter = configureRouter(express.Router(), config)

export default RatingRouter
