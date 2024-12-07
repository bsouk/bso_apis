
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

router.post(
  "/deleteSelectedCategory",
  trimRequest.all,
  requireAuth,
  controller.deleteSelectedCategory
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

router.post(
  "/deleteSelectedSubCategory",
  trimRequest.all,
  requireAuth,
  controller.deleteSelectedSubCategory
);

//sub-sub-category

router.post(
  "/addSubSubCategory",
  trimRequest.all,
  requireAuth,
  controller.addProductSubSubCategory
);

router.get(
  "/getSubSubCategories",
  trimRequest.all,
  requireAuth,
  controller.getSubSubCategory
);

router.patch(
  "/editSubSubCategory/:id",
  trimRequest.all,
  requireAuth,
  controller.editSubSubCategory
);

router.delete(
  "/deleteSubSubCategory/:id",
  trimRequest.all,
  requireAuth,
  controller.deleteSubSubCategory
);

router.get(
  "/getSubSubCategory/:id",
  trimRequest.all,
  requireAuth,
  controller.getSubSubCategoryById
);

router.post(
  "/deleteSelectedSubSubCategory",
  trimRequest.all,
  requireAuth,
  controller.deleteSelectedSubSubCategory
);


//get categories as per parents
router.get(
  '/getCategoryList',
  trimRequest.all,
  controller.getCategoryList
)

module.exports = router