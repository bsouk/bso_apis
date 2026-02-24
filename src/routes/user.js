const express = require('express')
const router = express.Router()
const fs = require('fs')
const trimRequest = require('trim-request')
const routesPath = `${__dirname}/user`
const { removeExtensionFromFile } = require('../utils/utils')
const userworkController = require('../controllers/user/userwork')

/*
 * Explicit route so POST /user/generateAiManualEnquiry is matched (avoids 404 when multiple routers mount at /user)
 */
router.post(
  '/user/generateAiManualEnquiry',
  trimRequest.all,
  userworkController.generateAiManualEnquiry
)

/*
 * Load routes statically and/or dynamically
*/

// Loop routes path and loads every file as a route except this file and Auth route
fs.readdirSync(routesPath).filter(file => {
  // Take filename and remove last part (extension)
  const routeFile = removeExtensionFromFile(file)
  // Prevents loading of this file and auth file
  return routeFile !== 'index'  ? router.use(`/user`, require(`./user/${routeFile}`)) : ''
})


module.exports = router
