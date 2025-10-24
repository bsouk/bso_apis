const Blog = require("../../models/blogs");
const BlogCategory = require("../../models/blog_categories");
const { buildErrObject, buildSuccObject } = require("../../utils/utils");

/**
 * Get all blogs with pagination, search, and category filter
 */
exports.getAllBlogs = async (req, res) => {
  try {
    const { limit = 10, offset = 0, search = "", category = "" } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    const options = {
      offset: parseInt(offset),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: { path: 'categories', select: 'category_name slug' }
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
 * Get single blog by ID
 */
exports.getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id).populate('categories', 'category_name slug');
    
    if (!blog) {
      return res.status(404).json(buildErrObject(404, "Blog not found"));
    }

    res.status(200).json(buildSuccObject(200, "Blog retrieved successfully", blog));
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Create blog
 */
exports.createBlog = async (req, res) => {
  try {
    const { title, slug, description, content, categories, image, author, status, tags } = req.body;

    // Check if slug already exists
    const existingBlog = await Blog.findOne({ slug });
    if (existingBlog) {
      return res.status(400).json(buildErrObject(400, "A blog with this slug already exists"));
    }

    // Verify categories exist and are active
    if (categories && categories.length > 0) {
      const categoryDocs = await BlogCategory.find({ _id: { $in: categories }, status: 'active' });
      if (categoryDocs.length !== categories.length) {
        return res.status(400).json(buildErrObject(400, "Some categories are invalid or inactive"));
      }
    }

    const blog = new Blog({
      title,
      slug,
      description,
      content,
      categories,
      image,
      author,
      status,
      tags
    });

    await blog.save();
    const populatedBlog = await Blog.findById(blog._id).populate('categories', 'category_name slug');

    res.status(201).json(buildSuccObject(201, "Blog created successfully", populatedBlog));
  } catch (error) {
    console.error("Error creating blog:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Update blog
 */
exports.updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check for duplicate slug
    if (updateData.slug) {
      const existingBlog = await Blog.findOne({
        slug: updateData.slug,
        _id: { $ne: id }
      });

      if (existingBlog) {
        return res.status(400).json(buildErrObject(400, "A blog with this slug already exists"));
      }
    }

    // Verify categories if being updated
    if (updateData.categories && updateData.categories.length > 0) {
      const categoryDocs = await BlogCategory.find({ _id: { $in: updateData.categories }, status: 'active' });
      if (categoryDocs.length !== updateData.categories.length) {
        return res.status(400).json(buildErrObject(400, "Some categories are invalid or inactive"));
      }
    }

    const blog = await Blog.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('categories', 'category_name slug');

    if (!blog) {
      return res.status(404).json(buildErrObject(404, "Blog not found"));
    }

    res.status(200).json(buildSuccObject(200, "Blog updated successfully", blog));
  } catch (error) {
    console.error("Error updating blog:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Delete blog
 */
exports.deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByIdAndDelete(id);

    if (!blog) {
      return res.status(404).json(buildErrObject(404, "Blog not found"));
    }

    res.status(200).json(buildSuccObject(200, "Blog deleted successfully", blog));
  } catch (error) {
    console.error("Error deleting blog:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Toggle blog status
 */
exports.toggleBlogStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json(buildErrObject(404, "Blog not found"));
    }

    blog.status = blog.status === 'active' ? 'inactive' : 'active';
    await blog.save();

    const populatedBlog = await Blog.findById(blog._id).populate('categories', 'category_name slug');
    res.status(200).json(buildSuccObject(200, "Blog status updated successfully", populatedBlog));
  } catch (error) {
    console.error("Error toggling blog status:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

