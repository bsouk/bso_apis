const express = require('express')
const router = express.Router()
const fs = require('fs')
const routesPath = `${__dirname}/admin`
const { removeExtensionFromFile } = require('../utils/utils')

/*
 * Load routes statically and/or dynamically
*/

// Loop routes path and loads every file as a route except this file and Auth route
fs.readdirSync(routesPath).filter(file => {
  // Take filename and remove last part (extension)
  const routeFile = removeExtensionFromFile(file)
  // Prevents loading of this file and auth file
  return routeFile !== 'index'  ? router.use(require(`./admin/${routeFile}`)) : ''
})


module.exports = router