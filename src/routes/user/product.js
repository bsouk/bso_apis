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

router.get(
    '/getProductList',
    trimRequest.all,
    controller.getProductList
)

router.patch(
    '/editProduct/:id',
    trimRequest.all,
    requireAuth,
    controller.editProduct
)

router.get(
    '/getProductNameList',
    trimRequest.all,
    requireAuth,
    controller.getProductNameList
)

router.patch(
    '/addReview',
    trimRequest.all,
    requireAuth,
    controller.addReview
)

module.exports = router