const Blog = require("../../models/blogs");
const BlogCategory = require("../../models/blog_categories");
const { buildErrObject, buildSuccObject } = require("../../utils/utils");
const AWS = require('aws-sdk');
const sharp = require('sharp');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.ACCESS_KEY,
  secretAccessKey: process.env.SECRET_KEY,
  region: process.env.REGION,
});

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
    let { title, slug, description, content, categories, author, status, tags } = req.body;
    
    // Parse categories if it's a JSON string
    if (typeof categories === 'string') {
      try {
        categories = JSON.parse(categories);
      } catch (e) {
        categories = [];
      }
    }
    
    // Parse tags if it's a JSON string
    if (typeof tags === 'string') {
      try {
        tags = JSON.parse(tags);
      } catch (e) {
        tags = [];
      }
    }

    // Check if slug already exists
    const existingBlog = await Blog.findOne({ slug });
    if (existingBlog) {
      return res.status(400).json(buildErrObject(400, "A blog with this slug already exists"));
    }

    // Check if image file is uploaded
    if (!req.files || !req.files.image) {
      return res.status(400).json(buildErrObject(400, "Blog image is required"));
    }

    const imageFile = req.files.image;

    // Validate file type (only WebP)
    if (!imageFile.mimetype.includes('webp')) {
      return res.status(400).json(buildErrObject(400, "Only WebP format is allowed"));
    }

    // Verify categories exist and are active
    if (categories && categories.length > 0) {
      const categoryDocs = await BlogCategory.find({ _id: { $in: categories }, status: 'active' });
      if (categoryDocs.length !== categories.length) {
        return res.status(400).json(buildErrObject(400, "Some categories are invalid or inactive"));
      }
    }

    // Process and upload image to S3
    try {
      // Optimize image using Sharp
      const optimizedImageBuffer = await sharp(imageFile.data)
        .webp({ quality: 85 })
        .toBuffer();

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `blogs/${timestamp}_${imageFile.name.replace(/\s+/g, '_')}`;

      // Upload to S3
      const uploadParams = {
        Bucket: process.env.Bucket,
        Key: fileName,
        Body: optimizedImageBuffer,
        ContentType: 'image/webp',
      };

      await s3.upload(uploadParams).promise();

      // Create blog with S3 path
      const blog = new Blog({
        title,
        slug,
        description,
        content,
        categories,
        image: fileName,
        author,
        status,
        tags
      });

      await blog.save();
      const populatedBlog = await Blog.findById(blog._id).populate('categories', 'category_name slug');

      res.status(201).json(buildSuccObject(201, "Blog created successfully", populatedBlog));
    } catch (uploadError) {
      console.error('Error uploading image to S3:', uploadError);
      return res.status(500).json(buildErrObject(500, "Failed to upload image to S3"));
    }
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
    
    // Parse categories if it's a JSON string
    if (typeof updateData.categories === 'string') {
      try {
        updateData.categories = JSON.parse(updateData.categories);
      } catch (e) {
        updateData.categories = [];
      }
    }
    
    // Parse tags if it's a JSON string
    if (typeof updateData.tags === 'string') {
      try {
        updateData.tags = JSON.parse(updateData.tags);
      } catch (e) {
        updateData.tags = [];
      }
    }

    // Find existing blog
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json(buildErrObject(404, "Blog not found"));
    }

    // Check for duplicate slug
    if (updateData.slug && updateData.slug !== blog.slug) {
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

    // Handle new image upload if provided
    if (req.files && req.files.image) {
      const imageFile = req.files.image;

      // Validate file type (only WebP)
      if (!imageFile.mimetype.includes('webp')) {
        return res.status(400).json(buildErrObject(400, "Only WebP format is allowed"));
      }

      try {
        // Delete old image from S3 if it exists
        if (blog.image && blog.image.startsWith('blogs/')) {
          try {
            const deleteParams = {
              Bucket: process.env.Bucket,
              Key: blog.image,
            };
            await s3.deleteObject(deleteParams).promise();
          } catch (s3Error) {
            console.error('Error deleting old image from S3:', s3Error);
            // Continue even if deletion fails
          }
        }

        // Optimize new image
        const optimizedImageBuffer = await sharp(imageFile.data)
          .webp({ quality: 85 })
          .toBuffer();

        // Generate unique filename
        const timestamp = Date.now();
        const fileName = `blogs/${timestamp}_${imageFile.name.replace(/\s+/g, '_')}`;

        // Upload to S3
        const uploadParams = {
          Bucket: process.env.Bucket,
          Key: fileName,
          Body: optimizedImageBuffer,
          ContentType: 'image/webp',
        };

        await s3.upload(uploadParams).promise();

        // Update image path
        updateData.image = fileName;
      } catch (uploadError) {
        console.error('Error uploading image to S3:', uploadError);
        return res.status(500).json(buildErrObject(500, "Failed to upload image to S3"));
      }
    }

    // Update blog
    Object.assign(blog, updateData);
    await blog.save();
    
    const populatedBlog = await Blog.findById(blog._id).populate('categories', 'category_name slug');

    res.status(200).json(buildSuccObject(200, "Blog updated successfully", populatedBlog));
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
    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json(buildErrObject(404, "Blog not found"));
    }

    // Delete image from S3 if it exists
    if (blog.image && blog.image.startsWith('blogs/')) {
      try {
        const deleteParams = {
          Bucket: process.env.Bucket,
          Key: blog.image,
        };
        await s3.deleteObject(deleteParams).promise();
      } catch (s3Error) {
        console.error('Error deleting image from S3:', s3Error);
        // Continue with blog deletion even if S3 fails
      }
    }

    // Delete blog from database
    await Blog.findByIdAndDelete(id);

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

