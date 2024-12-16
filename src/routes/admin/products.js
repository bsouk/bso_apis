const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/admin/products')
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
    requireAuth,
    controller.getProductList
)

router.patch(
    '/editProduct/:id',
    trimRequest.all,
    requireAuth,
    controller.editProduct
)

router.patch(
    '/approveRejectProduct',
    trimRequest.all,
    requireAuth,
    controller.approveRejectProduct
)

router.get(
    '/getProductNameList',
    trimRequest.all,
    requireAuth,
    controller.getProductNameList
)


router.get(
    '/getSkuVariant',
    trimRequest.all,
    requireAuth,
    controller.getSkuList
)

router.delete(
    '/deleteSelectedProduct',
    trimRequest.all,
    requireAuth,
    controller.deleteSelectedProducts
)


module.exports = router