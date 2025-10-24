const BlogCategory = require("../../models/blog_categories");
const { buildErrObject, buildSuccObject } = require("../../utils/utils");

/**
 * Get all blog categories with pagination and search
 */
exports.getAllBlogCategories = async (req, res) => {
  try {
    const { limit = 10, offset = 0, search = "" } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { category_name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      offset: parseInt(offset),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const categories = await BlogCategory.paginate(query, options);

    res.status(200).json({
      code: 200,
      message: "Blog categories retrieved successfully",
      data: categories.docs,
      totalDocs: categories.totalDocs,
      limit: categories.limit,
      page: categories.page,
      totalPages: categories.totalPages
    });
  } catch (error) {
    console.error("Error fetching blog categories:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Get active blog categories (for dropdowns)
 */
exports.getActiveBlogCategories = async (req, res) => {
  try {
    const categories = await BlogCategory.find({ status: 'active' })
      .select('category_name slug')
      .sort({ category_name: 1 });

    res.status(200).json(buildSuccObject(200, "Active categories retrieved successfully", categories));
  } catch (error) {
    console.error("Error fetching active categories:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Get single blog category
 */
exports.getBlogCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await BlogCategory.findById(id);
    
    if (!category) {
      return res.status(404).json(buildErrObject(404, "Blog category not found"));
    }

    res.status(200).json(buildSuccObject(200, "Blog category retrieved successfully", category));
  } catch (error) {
    console.error("Error fetching blog category:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Create blog category
 */
exports.createBlogCategory = async (req, res) => {
  try {
    const { category_name, slug, description, status } = req.body;

    // Check if category already exists
    const existing = await BlogCategory.findOne({ 
      $or: [{ category_name }, { slug }] 
    });
    
    if (existing) {
      return res.status(400).json(buildErrObject(400, "Category name or slug already exists"));
    }

    const category = new BlogCategory({
      category_name,
      slug,
      description,
      status
    });

    await category.save();
    res.status(201).json(buildSuccObject(201, "Blog category created successfully", category));
  } catch (error) {
    console.error("Error creating blog category:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Update blog category
 */
exports.updateBlogCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check for duplicate category_name or slug
    if (updateData.category_name || updateData.slug) {
      const existing = await BlogCategory.findOne({
        $or: [
          { category_name: updateData.category_name },
          { slug: updateData.slug }
        ],
        _id: { $ne: id }
      });

      if (existing) {
        return res.status(400).json(buildErrObject(400, "Category name or slug already exists"));
      }
    }

    const category = await BlogCategory.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json(buildErrObject(404, "Blog category not found"));
    }

    res.status(200).json(buildSuccObject(200, "Blog category updated successfully", category));
  } catch (error) {
    console.error("Error updating blog category:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Delete blog category
 */
exports.deleteBlogCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category is used by any blogs
    const Blog = require("../../models/blogs");
    const blogsCount = await Blog.countDocuments({ category: id });

    if (blogsCount > 0) {
      return res.status(400).json(buildErrObject(400, `Cannot delete category. ${blogsCount} blog(s) are using this category.`));
    }

    const category = await BlogCategory.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json(buildErrObject(404, "Blog category not found"));
    }

    res.status(200).json(buildSuccObject(200, "Blog category deleted successfully", category));
  } catch (error) {
    console.error("Error deleting blog category:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Toggle blog category status
 */
exports.toggleBlogCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await BlogCategory.findById(id);

    if (!category) {
      return res.status(404).json(buildErrObject(404, "Blog category not found"));
    }

    category.status = category.status === 'active' ? 'inactive' : 'active';
    await category.save();

    res.status(200).json(buildSuccObject(200, "Category status updated successfully", category));
  } catch (error) {
    console.error("Error toggling category status:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

