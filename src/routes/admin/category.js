
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
  requireAuth,
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

router.patch(
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

//subcategory

router.post(
  "/addSubCategory",
  trimRequest.all,
  requireAuth,
  controller.addProductSubCategory
);

router.get(
  "/getSubCategories",
  trimRequest.all,
  requireAuth,
  controller.getSubCategory
);

router.patch(
  "/editSubCategory/:id",
  trimRequest.all,
  requireAuth,
  controller.editSubCategory
);

router.delete(
  "/deleteSubCategory/:id",
  trimRequest.all,
  requireAuth,
  controller.deleteSubCategory
);

router.get(
  "/getSubCategory/:id",
  trimRequest.all,
  requireAuth,
  controller.getSubCategoryById
);

module.exports = router