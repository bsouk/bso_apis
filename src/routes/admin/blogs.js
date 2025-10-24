const express = require('express');
const router = express.Router();
const passport = require('passport');
require('../../config/passport');

const {
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  toggleBlogStatus
} = require('../../controllers/admin/blogs');

const requireAuth = passport.authenticate('jwt', { session: false });

// Routes
router.get('/getAllBlogs', requireAuth, getAllBlogs);
router.get('/getBlog/:id', requireAuth, getBlogById);
router.post('/createBlog', requireAuth, createBlog);
router.put('/updateBlog/:id', requireAuth, updateBlog);
router.delete('/deleteBlog/:id', requireAuth, deleteBlog);
router.patch('/toggleBlogStatus/:id', requireAuth, toggleBlogStatus);

module.exports = router;

