const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
  session: false
})

const controller = require('../../controllers/admin/cms')
const trimRequest = require('trim-request')

router.post(
  "/addFaq",
  requireAuth,
  trimRequest.all,
  controller.addFaq
)

router.get(
  "/getFaqList",
  requireAuth,
  trimRequest.all,
  controller.getFaqList
)

router.get(
  "/getSingleFaq/:id",
  requireAuth,
  trimRequest.all,
  controller.getSingleFaq
)

router.delete(
  "/deleteFaq/:id",
  requireAuth,
  trimRequest.all,
  controller.deleteFaq
)

router.put(
  "/editFaq/:id",
  requireAuth,
  trimRequest.all,
  controller.editFaq
)


router.put(
  "/addCMS",
  requireAuth,
  trimRequest.all,
  controller.addCMS
)

router.get(
  "/getCMS",
  requireAuth,
  trimRequest.all,
  controller.getCMS
)


router.put(
  "/addWalkthrough",
  requireAuth,
  trimRequest.all,
  controller.addWalkthrough
)

router.get(
  "/getWalkthrough",
  requireAuth,
  trimRequest.all,
  controller.getWalkthrough
)

router.get(
  "/getContactUs",
  requireAuth,
  trimRequest.all,
  controller.getContactUs
)

router.get(
  "/getContactUsDetails",
  requireAuth,
  trimRequest.all,
  controller.getContactUsDetails
)


router.post(
  "/addContactUsDetails",
  requireAuth,
  trimRequest.all,
  controller.addContactUsDetails
)
router.post("/query-reply",trimRequest.all,requireAuth,controller.queryReply);
router.patch("/change-query-status",trimRequest.all,requireAuth,controller.changeQueryStatus);
router.delete("/delete-query/:id",trimRequest.all,requireAuth,controller.deleteQuery)
module.exports = router
