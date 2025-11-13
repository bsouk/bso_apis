const express = require('express');
const router = express.Router();
const trimRequest = require('trim-request');

const controller = require('../../controllers/user/currency');

router.get(
  '/currency',
  trimRequest.all,
  controller.getCurrencies
);

module.exports = router;



