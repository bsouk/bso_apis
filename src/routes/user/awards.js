const express = require('express');
const router = express.Router();
const awardsController = require('../../controllers/user/awards');

// Public routes
router.get('/awards', awardsController.getActiveAwards);
router.get('/awards/count', awardsController.getAwardsCount);

module.exports = router;

