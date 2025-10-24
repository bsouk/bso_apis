const express = require('express');
const router = express.Router();

const {
  getAllActiveMetaScripts,
  getMetaScriptsByPosition
} = require('../../controllers/user/metaScripts');

// Public routes - no authentication required
router.get(
  '/getAllActiveMetaScripts',
  getAllActiveMetaScripts
);

router.get(
  '/getMetaScriptsByPosition/:position',
  getMetaScriptsByPosition
);

module.exports = router;

