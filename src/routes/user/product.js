const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/user/prodcuts')
const trimRequest = require('trim-request');

router.post(
    '/addProduct',
    trimRequest.all,
    requireAuth,
    controller.addProduct
)
router.delete(
    '/deleteProduct/:id',
    trimRequest.all,
    requireAuth,
    controller.deleteProduct
)

router.get(
    '/getProduct/:id',
    trimRequest.all,
    requireAuth,
    controller.getProduct
)

module.exports = router