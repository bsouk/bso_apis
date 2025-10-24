const express = require('express');
const router = express.Router();

const {
  getAllActiveBlogs,
  getBlogBySlug,
  getRecentBlogs,
  getPopularBlogs,
  getActiveBlogCategories,
  getBlogsByCategory
} = require('../../controllers/user/blogs');

// Public routes
router.get('/getAllBlogs', getAllActiveBlogs);
router.get('/getBlogBySlug/:slug', getBlogBySlug);
router.get('/getRecentBlogs', getRecentBlogs);
router.get('/getPopularBlogs', getPopularBlogs);
router.get('/getBlogCategories', getActiveBlogCategories);
router.get('/getBlogsByCategory/:categorySlug', getBlogsByCategory);

module.exports = router;

