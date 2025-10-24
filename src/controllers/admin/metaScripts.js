const MetaScript = require("../../models/meta_scripts");
const { buildErrObject, buildSuccObject } = require("../../utils/utils");

/**
 * Get all meta scripts with pagination and search
 */
exports.getAllMetaScripts = async (req, res) => {
  try {
    const { limit = 10, offset = 0, search = "" } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { script_name: { $regex: search, $options: 'i' } },
        { script_type: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      offset: parseInt(offset),
      limit: parseInt(limit),
      sort: { order: 1, createdAt: -1 }
    };

    const scripts = await MetaScript.paginate(query, options);

    res.status(200).json({
      code: 200,
      message: "Meta scripts retrieved successfully",
      data: scripts.docs,
      totalDocs: scripts.totalDocs,
      limit: scripts.limit,
      page: scripts.page,
      totalPages: scripts.totalPages,
      pagingCounter: scripts.pagingCounter,
      hasPrevPage: scripts.hasPrevPage,
      hasNextPage: scripts.hasNextPage,
      prevPage: scripts.prevPage,
      nextPage: scripts.nextPage
    });
  } catch (error) {
    console.error("Error fetching meta scripts:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Get single meta script by ID
 */
exports.getMetaScriptById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const script = await MetaScript.findById(id);
    
    if (!script) {
      return res.status(404).json(buildErrObject(404, "Meta script not found"));
    }

    res.status(200).json(buildSuccObject(200, "Meta script retrieved successfully", script));
  } catch (error) {
    console.error("Error fetching meta script:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Create new meta script
 */
exports.createMetaScript = async (req, res) => {
  try {
    const {
      script_name,
      description,
      script_type,
      position,
      script_content,
      placeholders,
      order,
      load_strategy,
      status,
      notes,
      added_by
    } = req.body;

    const script = new MetaScript({
      script_name,
      description,
      script_type,
      position,
      script_content,
      placeholders,
      order,
      load_strategy,
      status,
      notes,
      added_by
    });

    await script.save();

    res.status(201).json(buildSuccObject(201, "Meta script created successfully", script));
  } catch (error) {
    console.error("Error creating meta script:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Update meta script
 */
exports.updateMetaScript = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const script = await MetaScript.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!script) {
      return res.status(404).json(buildErrObject(404, "Meta script not found"));
    }

    res.status(200).json(buildSuccObject(200, "Meta script updated successfully", script));
  } catch (error) {
    console.error("Error updating meta script:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Delete meta script
 */
exports.deleteMetaScript = async (req, res) => {
  try {
    const { id } = req.params;

    const script = await MetaScript.findByIdAndDelete(id);

    if (!script) {
      return res.status(404).json(buildErrObject(404, "Meta script not found"));
    }

    res.status(200).json(buildSuccObject(200, "Meta script deleted successfully", script));
  } catch (error) {
    console.error("Error deleting meta script:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Toggle meta script status (active/inactive)
 */
exports.toggleMetaScriptStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const script = await MetaScript.findById(id);

    if (!script) {
      return res.status(404).json(buildErrObject(404, "Meta script not found"));
    }

    // Toggle status
    script.status = script.status === 'active' ? 'inactive' : 'active';
    await script.save();

    res.status(200).json(buildSuccObject(200, "Meta script status updated successfully", script));
  } catch (error) {
    console.error("Error toggling meta script status:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

