const Blog = require("../../models/blogs");
const BlogCategory = require("../../models/blog_categories");
const { buildErrObject, buildSuccObject } = require("../../utils/utils");

/**
 * Get all active blogs with pagination, search, and category filter
 */
exports.getAllActiveBlogs = async (req, res) => {
  try {
    const { limit = 10, offset = 0, search = "", category = "" } = req.query;
    
    const query = { status: 'active' };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.categories = category;
    }

    const options = {
      offset: parseInt(offset),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: { path: 'categories', select: 'category_name slug' },
      select: 'title slug description image categories author createdAt views tags'
    };

    const blogs = await Blog.paginate(query, options);

    res.status(200).json({
      code: 200,
      message: "Blogs retrieved successfully",
      data: blogs.docs,
      totalDocs: blogs.totalDocs,
      limit: blogs.limit,
      page: blogs.page,
      totalPages: blogs.totalPages
    });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Get single blog by slug
 */
exports.getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const blog = await Blog.findOne({ slug, status: 'active' })
      .populate('categories', 'category_name slug');
    
    if (!blog) {
      return res.status(404).json(buildErrObject(404, "Blog not found"));
    }

    // Increment view count
    blog.views += 1;
    await blog.save();

    res.status(200).json(buildSuccObject(200, "Blog retrieved successfully", blog));
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Get recent blogs (for sidebar/widgets)
 */
exports.getRecentBlogs = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const blogs = await Blog.find({ status: 'active' })
      .select('title slug image createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json(buildSuccObject(200, "Recent blogs retrieved successfully", blogs));
  } catch (error) {
    console.error("Error fetching recent blogs:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Get popular blogs (most viewed)
 */
exports.getPopularBlogs = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const blogs = await Blog.find({ status: 'active' })
      .select('title slug image views createdAt')
      .sort({ views: -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json(buildSuccObject(200, "Popular blogs retrieved successfully", blogs));
  } catch (error) {
    console.error("Error fetching popular blogs:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Get active blog categories
 */
exports.getActiveBlogCategories = async (req, res) => {
  try {
    const categories = await BlogCategory.find({ status: 'active' })
      .select('category_name slug')
      .sort({ category_name: 1 });

    res.status(200).json(buildSuccObject(200, "Categories retrieved successfully", categories));
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Get blogs by category slug
 */
exports.getBlogsByCategory = async (req, res) => {
  try {
    const { categorySlug } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    // Find category first
    const category = await BlogCategory.findOne({ slug: categorySlug, status: 'active' });
    
    if (!category) {
      return res.status(404).json(buildErrObject(404, "Category not found"));
    }

    const options = {
      offset: parseInt(offset),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: { path: 'categories', select: 'category_name slug' },
      select: 'title slug description image categories author createdAt views tags'
    };

    const blogs = await Blog.paginate(
      { categories: category._id, status: 'active' },
      options
    );

    res.status(200).json({
      code: 200,
      message: "Blogs retrieved successfully",
      data: blogs.docs,
      category: category,
      totalDocs: blogs.totalDocs,
      limit: blogs.limit,
      page: blogs.page,
      totalPages: blogs.totalPages
    });
  } catch (error) {
    console.error("Error fetching blogs by category:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

