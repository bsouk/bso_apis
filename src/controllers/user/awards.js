const Awards = require('../../models/awards');

/**
 * @desc    Get all active awards (for frontend)
 * @route   GET /user/awards
 * @access  Public
 */
exports.getActiveAwards = async (req, res) => {
  try {
    // Fetch only active awards, sorted by order
    const awards = await Awards.find({ is_active: true })
      .sort({ order: 1, createdAt: -1 })
      .select('image image_alt order')
      .lean();

    return res.status(200).json({
      code: 200,
      msg: 'Active awards fetched successfully',
      data: awards,
    });
  } catch (error) {
    console.error('Error fetching active awards:', error);
    return res.status(500).json({
      code: 500,
      errors: { msg: 'Server error while fetching awards' },
    });
  }
};

/**
 * @desc    Get awards count (public)
 * @route   GET /user/awards/count
 * @access  Public
 */
exports.getAwardsCount = async (req, res) => {
  try {
    const count = await Awards.countDocuments({ is_active: true });

    return res.status(200).json({
      code: 200,
      msg: 'Awards count fetched successfully',
      data: { count },
    });
  } catch (error) {
    console.error('Error fetching awards count:', error);
    return res.status(500).json({
      code: 500,
      errors: { msg: 'Server error while fetching count' },
    });
  }
};





