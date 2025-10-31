const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const awardsController = require('../../controllers/admin/awards');

// Validation rules
const createAwardValidation = [
  body('image_alt')
    .trim()
    .notEmpty()
    .withMessage('Image alt text is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Image alt must be between 3 and 200 characters'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('Is active must be a boolean'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a positive integer'),
];

const updateAwardValidation = [
  body('image_alt')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Image alt must be between 3 and 200 characters'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('Is active must be a boolean'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a positive integer'),
];

// Routes (without /admin prefix - it's added by the main router)
router.get('/awards', awardsController.getAllAwards);
router.get('/awards/:id', awardsController.getAwardById);
router.post('/awards', createAwardValidation, awardsController.createAward);
router.put('/awards/:id', updateAwardValidation, awardsController.updateAward);
router.patch('/awards/:id/toggle-status', awardsController.toggleAwardStatus);
router.patch('/awards/:id/order', awardsController.updateAwardOrder);
router.delete('/awards/:id', awardsController.deleteAward);

module.exports = router;

