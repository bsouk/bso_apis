const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/user/categories')
const trimRequest = require('trim-request');


router.get(
    '/getCategoryList',
    trimRequest.all,
    controller.getCategoryList
)

router.get(
    '/getBusinessCategories',
    trimRequest.all,
    controller.getBusinessCategories
)

router.post(
  "/addProductCategory",
  trimRequest.all,
  requireAuth,
  controller.addProductCategory
);


router.post(
  "/addSubCategory",
  trimRequest.all,
  requireAuth,
  controller.addProductSubCategory
);


router.post(
  "/addSubSubCategory",
  trimRequest.all,
  requireAuth,
  controller.addProductSubSubCategory
);

module.exports = router