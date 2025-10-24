const express = require('express');
const router = express.Router();
const passport = require('passport');
require('../../config/passport');

const {
  getAllBlogCategories,
  getActiveBlogCategories,
  getBlogCategoryById,
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
  toggleBlogCategoryStatus
} = require('../../controllers/admin/blogCategories');

const requireAuth = passport.authenticate('jwt', { session: false });

// Routes
router.get('/getAllBlogCategories', requireAuth, getAllBlogCategories);
router.get('/getActiveBlogCategories', requireAuth, getActiveBlogCategories);
router.get('/getBlogCategory/:id', requireAuth, getBlogCategoryById);
router.post('/createBlogCategory', requireAuth, createBlogCategory);
router.put('/updateBlogCategory/:id', requireAuth, updateBlogCategory);
router.delete('/deleteBlogCategory/:id', requireAuth, deleteBlogCategory);
router.patch('/toggleBlogCategoryStatus/:id', requireAuth, toggleBlogCategoryStatus);

module.exports = router;

