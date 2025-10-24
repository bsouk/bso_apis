const SeoPage = require("../../models/seo_pages");
const { buildErrObject, buildSuccObject } = require("../../utils/utils");

/**
 * Get all SEO pages with pagination and search
 */
exports.getAllSeoPages = async (req, res) => {
  try {
    const { limit = 10, offset = 0, search = "" } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { page_name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      offset: parseInt(offset),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const seoPages = await SeoPage.paginate(query, options);

    res.status(200).json({
      code: 200,
      message: "SEO pages retrieved successfully",
      data: seoPages.docs,
      totalDocs: seoPages.totalDocs,
      limit: seoPages.limit,
      page: seoPages.page,
      totalPages: seoPages.totalPages,
      pagingCounter: seoPages.pagingCounter,
      hasPrevPage: seoPages.hasPrevPage,
      hasNextPage: seoPages.hasNextPage,
      prevPage: seoPages.prevPage,
      nextPage: seoPages.nextPage
    });
  } catch (error) {
    console.error("Error fetching SEO pages:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Get single SEO page by ID
 */
exports.getSeoPageById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const seoPage = await SeoPage.findById(id);
    
    if (!seoPage) {
      return res.status(404).json(buildErrObject(404, "SEO page not found"));
    }

    res.status(200).json(buildSuccObject(200, "SEO page retrieved successfully", seoPage));
  } catch (error) {
    console.error("Error fetching SEO page:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Create new SEO page
 */
exports.createSeoPage = async (req, res) => {
  try {
    const {
      page_name,
      slug,
      title,
      description,
      keywords,
      og_title,
      og_description,
      og_image,
      og_url,
      og_type,
      twitter_card,
      twitter_title,
      twitter_description,
      twitter_image,
      canonical_url,
      robots,
      author,
      status
    } = req.body;

    // Check if slug already exists
    const existingSeoPage = await SeoPage.findOne({ slug });
    if (existingSeoPage) {
      return res.status(400).json(buildErrObject(400, "SEO page with this slug already exists"));
    }

    const seoPage = new SeoPage({
      page_name,
      slug,
      title,
      description,
      keywords,
      og_title,
      og_description,
      og_image,
      og_url,
      og_type,
      twitter_card,
      twitter_title,
      twitter_description,
      twitter_image,
      canonical_url,
      robots,
      author,
      status
    });

    await seoPage.save();

    res.status(201).json(buildSuccObject(201, "SEO page created successfully", seoPage));
  } catch (error) {
    console.error("Error creating SEO page:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Update SEO page
 */
exports.updateSeoPage = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // If slug is being updated, check if new slug exists
    if (updateData.slug) {
      const existingSeoPage = await SeoPage.findOne({ 
        slug: updateData.slug,
        _id: { $ne: id }
      });
      if (existingSeoPage) {
        return res.status(400).json(buildErrObject(400, "SEO page with this slug already exists"));
      }
    }

    const seoPage = await SeoPage.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!seoPage) {
      return res.status(404).json(buildErrObject(404, "SEO page not found"));
    }

    res.status(200).json(buildSuccObject(200, "SEO page updated successfully", seoPage));
  } catch (error) {
    console.error("Error updating SEO page:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Delete SEO page
 */
exports.deleteSeoPage = async (req, res) => {
  try {
    const { id } = req.params;

    const seoPage = await SeoPage.findByIdAndDelete(id);

    if (!seoPage) {
      return res.status(404).json(buildErrObject(404, "SEO page not found"));
    }

    res.status(200).json(buildSuccObject(200, "SEO page deleted successfully", seoPage));
  } catch (error) {
    console.error("Error deleting SEO page:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Toggle SEO page status (active/inactive)
 */
exports.toggleSeoPageStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const seoPage = await SeoPage.findById(id);

    if (!seoPage) {
      return res.status(404).json(buildErrObject(404, "SEO page not found"));
    }

    // Toggle status
    seoPage.status = seoPage.status === 'active' ? 'inactive' : 'active';
    await seoPage.save();

    res.status(200).json(buildSuccObject(200, "SEO page status updated successfully", seoPage));
  } catch (error) {
    console.error("Error toggling SEO page status:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

