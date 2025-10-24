const SeoPage = require("../../models/seo_pages");
const { buildErrObject, buildSuccObject } = require("../../utils/utils");

/**
 * Get SEO page by slug for frontend
 */
exports.getSeoPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const seoPage = await SeoPage.findOne({ 
      slug,
      status: 'active'
    });

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
 * Get all active SEO pages (for sitemap generation, etc.)
 */
exports.getAllActiveSeoPages = async (req, res) => {
  try {
    const seoPages = await SeoPage.find({ status: 'active' })
      .select('page_name slug title description')
      .sort({ createdAt: -1 });

    res.status(200).json(buildSuccObject(200, "SEO pages retrieved successfully", seoPages));
  } catch (error) {
    console.error("Error fetching SEO pages:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

