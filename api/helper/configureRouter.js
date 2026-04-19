import _ from 'lodash'

/**
 * Wraps async middlewares to catch errors and pass them to next().
 */
function asyncWrapper(middleware) {
  return (req, res, next) => {
    Promise.resolve(middleware(req, res, next)).catch(next)
  }
}

/**
 * Sends the final JSON response.
 */
function handleResponse(req, res) {
  res.status(res.body?.statusCode || 200).json(res.body || {})
}

/**
 * Configures the router with the provided configuration.
 *
 * @param {import('express').Router} router - The Express router instance.
 * @param {Object} masterConfig - The base configuration.
 * @param {Object} [customConfig={ enabled: true }] - Overrides for the base configuration.
 * @returns {import('express').Router}
 */
export default function configureRouter(
  router,
  masterConfig,
  customConfig = { enabled: true }
) {
  const config = _.merge(masterConfig, customConfig)
  _buildRoutes(router, config)
  return router
}

/**
 * Builds routes from configuration.
 */
function _buildRoutes(router, config) {
  const {
    routerName = '',
    routesConfig = {},
    enabled: routerEnabled = false,
    preMiddlewares = [],
    postMiddlewares = []
  } = config

  const disabledRoutes = []

  Object.keys(routesConfig).forEach(routeKey => {
    const routeConfig = routesConfig[routeKey]
    const {
      method,
      path,
      prePipeline = [],
      pipeline = [],
      postPipeline = [],
      enabled = false
    } = routeConfig || {}

    if (!path || !method) {
      console.error(`[Router ${routerName}] Missing method or path for route: ${routeKey}`)
      return
    }

    if (!enabled && !routerEnabled) {
      disabledRoutes.push(routeKey)
      return
    }

    router[method.toLowerCase()](
      path,
      ...preMiddlewares.map(asyncWrapper),
      ...prePipeline.map(asyncWrapper),
      ...pipeline.map(asyncWrapper),
      ...postPipeline.map(asyncWrapper),
      ...postMiddlewares.map(asyncWrapper),
      asyncWrapper(handleResponse)
    )
  })

  if (disabledRoutes.length) {
    console.warn(`[Router ${routerName}] Disabled routes: ${disabledRoutes.join(', ')}`)
  }
}
