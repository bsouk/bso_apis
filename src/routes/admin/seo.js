const express = require('express');
const router = express.Router();
const passport = require('passport');
require('../../config/passport');

const {
  getAllSeoPages,
  getSeoPageById,
  createSeoPage,
  updateSeoPage,
  deleteSeoPage,
  toggleSeoPageStatus
} = require('../../controllers/admin/seo');

// Middleware
const requireAuth = passport.authenticate('jwt', { session: false });

// Routes
router.get(
  '/getAllSeoPages',
  requireAuth,
  getAllSeoPages
);

router.get(
  '/getSeoPage/:id',
  requireAuth,
  getSeoPageById
);

router.post(
  '/createSeoPage',
  requireAuth,
  createSeoPage
);

router.put(
  '/updateSeoPage/:id',
  requireAuth,
  updateSeoPage
);

router.delete(
  '/deleteSeoPage/:id',
  requireAuth,
  deleteSeoPage
);

router.patch(
  '/toggleSeoPageStatus/:id',
  requireAuth,
  toggleSeoPageStatus
);

module.exports = router;

