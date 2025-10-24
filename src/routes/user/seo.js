const express = require('express');
const router = express.Router();

const {
  getSeoPageBySlug,
  getAllActiveSeoPages
} = require('../../controllers/user/seo');

// Routes
router.get(
  '/getSeoBySlug/:slug',
  getSeoPageBySlug
);

router.get(
  '/getAllActiveSeoPages',
  getAllActiveSeoPages
);

module.exports = router;

