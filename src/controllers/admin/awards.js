const Awards = require('../../models/awards');
const AWS = require('aws-sdk');
const sharp = require('sharp');
const { validationResult } = require('express-validator');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.ACCESS_KEY,
  secretAccessKey: process.env.SECRET_KEY,
  region: process.env.REGION,
});

/**
 * @desc    Get all awards with pagination and search
 * @route   GET /admin/awards
 * @access  Private (Admin)
 */
exports.getAllAwards = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;

    // Build query
    let query = {};

    // Search in image_alt
    if (search) {
      query.image_alt = { $regex: search, $options: 'i' };
    }

    // Filter by status
    if (status !== '') {
      query.is_active = status === 'true';
    }

    // Pagination options
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { order: 1, createdAt: -1 },
      lean: true,
    };

    const awards = await Awards.paginate(query, options);

    return res.status(200).json({
      code: 200,
      msg: 'Awards fetched successfully',
      data: awards,
    });
  } catch (error) {
    console.error('Error fetching awards:', error);
    return res.status(500).json({
      code: 500,
      errors: { msg: 'Server error while fetching awards' },
    });
  }
};

/**
 * @desc    Get single award by ID
 * @route   GET /admin/awards/:id
 * @access  Private (Admin)
 */
exports.getAwardById = async (req, res) => {
  try {
    const award = await Awards.findById(req.params.id);

    if (!award) {
      return res.status(404).json({
        code: 404,
        errors: { msg: 'Award not found' },
      });
    }

    return res.status(200).json({
      code: 200,
      msg: 'Award fetched successfully',
      data: award,
    });
  } catch (error) {
    console.error('Error fetching award:', error);
    return res.status(500).json({
      code: 500,
      errors: { msg: 'Server error while fetching award' },
    });
  }
};

/**
 * @desc    Create new award
 * @route   POST /admin/awards
 * @access  Private (Admin)
 */
exports.createAward = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        code: 400,
        errors: errors.array()[0],
      });
    }

    const { image_alt, is_active = true, order = 0 } = req.body;

    // Check if image file is uploaded
    if (!req.files || !req.files.image) {
      return res.status(400).json({
        code: 400,
        errors: { msg: 'Award image is required' },
      });
    }

    const imageFile = req.files.image;

    // Validate file type (only WebP)
    if (!imageFile.mimetype.includes('webp')) {
      return res.status(400).json({
        code: 400,
        errors: { msg: 'Only WebP format is allowed' },
      });
    }

    // Process and upload image to S3
    try {
      // Optimize image using Sharp
      const optimizedImageBuffer = await sharp(imageFile.data)
        .webp({ quality: 85 })
        .toBuffer();

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `awards/${timestamp}_${imageFile.name.replace(/\s+/g, '_')}`;

      // Upload to S3
      const uploadParams = {
        Bucket: process.env.Bucket,
        Key: fileName,
        Body: optimizedImageBuffer,
        ContentType: 'image/webp',
      };

      await s3.upload(uploadParams).promise();

      // Create award record
      const award = new Awards({
        image: fileName,
        image_alt,
        is_active,
        order: parseInt(order) || 0,
      });

      await award.save();

      return res.status(201).json({
        code: 201,
        msg: 'Award created successfully',
        data: award,
      });
    } catch (uploadError) {
      console.error('Error uploading image to S3:', uploadError);
      return res.status(500).json({
        code: 500,
        errors: { msg: 'Failed to upload image to S3' },
      });
    }
  } catch (error) {
    console.error('Error creating award:', error);
    return res.status(500).json({
      code: 500,
      errors: { msg: 'Server error while creating award' },
    });
  }
};

/**
 * @desc    Update award
 * @route   PUT /admin/awards/:id
 * @access  Private (Admin)
 */
exports.updateAward = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        code: 400,
        errors: errors.array()[0],
      });
    }

    const { image_alt, is_active, order } = req.body;

    // Find award
    const award = await Awards.findById(req.params.id);

    if (!award) {
      return res.status(404).json({
        code: 404,
        errors: { msg: 'Award not found' },
      });
    }

    // Update fields
    if (image_alt !== undefined) award.image_alt = image_alt;
    if (is_active !== undefined) award.is_active = is_active;
    if (order !== undefined) award.order = parseInt(order);

    // Check if new image is uploaded
    if (req.files && req.files.image) {
      const imageFile = req.files.image;

      // Validate file type
      if (!imageFile.mimetype.includes('webp')) {
        return res.status(400).json({
          code: 400,
          errors: { msg: 'Only WebP format is allowed' },
        });
      }

      try {
        // Delete old image from S3
        if (award.image) {
          const deleteParams = {
            Bucket: process.env.Bucket,
            Key: award.image,
          };
          await s3.deleteObject(deleteParams).promise();
        }

        // Optimize new image
        const optimizedImageBuffer = await sharp(imageFile.data)
          .webp({ quality: 85 })
          .toBuffer();

        // Generate unique filename
        const timestamp = Date.now();
        const fileName = `awards/${timestamp}_${imageFile.name.replace(/\s+/g, '_')}`;

        // Upload to S3
        const uploadParams = {
          Bucket: process.env.Bucket,
          Key: fileName,
          Body: optimizedImageBuffer,
          ContentType: 'image/webp',
        };

        await s3.upload(uploadParams).promise();

        // Update image path
        award.image = fileName;
      } catch (uploadError) {
        console.error('Error uploading image to S3:', uploadError);
        return res.status(500).json({
          code: 500,
          errors: { msg: 'Failed to upload image to S3' },
        });
      }
    }

    await award.save();

    return res.status(200).json({
      code: 200,
      msg: 'Award updated successfully',
      data: award,
    });
  } catch (error) {
    console.error('Error updating award:', error);
    return res.status(500).json({
      code: 500,
      errors: { msg: 'Server error while updating award' },
    });
  }
};

/**
 * @desc    Toggle award status
 * @route   PATCH /admin/awards/:id/toggle-status
 * @access  Private (Admin)
 */
exports.toggleAwardStatus = async (req, res) => {
  try {
    const award = await Awards.findById(req.params.id);

    if (!award) {
      return res.status(404).json({
        code: 404,
        errors: { msg: 'Award not found' },
      });
    }

    // Toggle status
    award.is_active = !award.is_active;
    await award.save();

    return res.status(200).json({
      code: 200,
      msg: `Award ${award.is_active ? 'activated' : 'deactivated'} successfully`,
      data: award,
    });
  } catch (error) {
    console.error('Error toggling award status:', error);
    return res.status(500).json({
      code: 500,
      errors: { msg: 'Server error while toggling status' },
    });
  }
};

/**
 * @desc    Delete award
 * @route   DELETE /admin/awards/:id
 * @access  Private (Admin)
 */
exports.deleteAward = async (req, res) => {
  try {
    const award = await Awards.findById(req.params.id);

    if (!award) {
      return res.status(404).json({
        code: 404,
        errors: { msg: 'Award not found' },
      });
    }

    // Delete image from S3
    if (award.image) {
      try {
        const deleteParams = {
          Bucket: process.env.Bucket,
          Key: award.image,
        };
        await s3.deleteObject(deleteParams).promise();
      } catch (s3Error) {
        console.error('Error deleting image from S3:', s3Error);
        // Continue with deletion even if S3 fails
      }
    }

    // Delete award from database
    await Awards.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      code: 200,
      msg: 'Award deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting award:', error);
    return res.status(500).json({
      code: 500,
      errors: { msg: 'Server error while deleting award' },
    });
  }
};

/**
 * @desc    Update award order
 * @route   PATCH /admin/awards/:id/order
 * @access  Private (Admin)
 */
exports.updateAwardOrder = async (req, res) => {
  try {
    const { order } = req.body;

    if (order === undefined || order === null) {
      return res.status(400).json({
        code: 400,
        errors: { msg: 'Order is required' },
      });
    }

    const award = await Awards.findByIdAndUpdate(
      req.params.id,
      { order: parseInt(order) },
      { new: true }
    );

    if (!award) {
      return res.status(404).json({
        code: 404,
        errors: { msg: 'Award not found' },
      });
    }

    return res.status(200).json({
      code: 200,
      msg: 'Award order updated successfully',
      data: award,
    });
  } catch (error) {
    console.error('Error updating award order:', error);
    return res.status(500).json({
      code: 500,
      errors: { msg: 'Server error while updating order' },
    });
  }
};

