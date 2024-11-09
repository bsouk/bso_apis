
const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/admin/category')
const trimRequest = require('trim-request')

router.post(
    "/addProductCategory",
    trimRequest.all,
    // requireAuth,
    controller.addProductCategory
  );
router.get(
    "/productCategories",
    trimRequest.all,
    requireAuth,
    controller.productCategories
  );
  
  router.get(
    "/getProductCategory/:id",
    trimRequest.all,
    requireAuth,
    controller.getProductCategory
  );
  
  router.put(
    "/editProductCategory/:id",
    trimRequest.all,
    requireAuth,
    controller.editProductCategory
  );
  
  router.delete(
    "/deleteProductCategory/:id",
    trimRequest.all,
    requireAuth,
    controller.deleteProductCategory
  );

module.exports = router