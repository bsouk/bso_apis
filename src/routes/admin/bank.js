
const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
  session: false
})

const controller = require('../../controllers/admin/bank')
const trimRequest = require('trim-request')
router.post(
  "/add-edit-bank",
  trimRequest.all,
  requireAuth,
  controller.addEditBank
)
router.get(
    "/get-bank",
    trimRequest.all,
    requireAuth,
    controller.getBank
)
module.exports = router