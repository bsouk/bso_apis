const express = require('express');
const router = express.Router();
const passport = require('passport');
require('../../config/passport');

const {
  getAllMetaScripts,
  getMetaScriptById,
  createMetaScript,
  updateMetaScript,
  deleteMetaScript,
  toggleMetaScriptStatus
} = require('../../controllers/admin/metaScripts');

// Middleware
const requireAuth = passport.authenticate('jwt', { session: false });

// Routes
router.get(
  '/getAllMetaScripts',
  requireAuth,
  getAllMetaScripts
);

router.get(
  '/getMetaScript/:id',
  requireAuth,
  getMetaScriptById
);

router.post(
  '/createMetaScript',
  requireAuth,
  createMetaScript
);

router.put(
  '/updateMetaScript/:id',
  requireAuth,
  updateMetaScript
);

router.delete(
  '/deleteMetaScript/:id',
  requireAuth,
  deleteMetaScript
);

router.patch(
  '/toggleMetaScriptStatus/:id',
  requireAuth,
  toggleMetaScriptStatus
);

module.exports = router;

