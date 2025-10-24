const MetaScript = require("../../models/meta_scripts");
const { buildErrObject, buildSuccObject } = require("../../utils/utils");

/**
 * Replace placeholders in script content with environment variables
 * Security: Keys are stored in .env, not in database
 */
function replacePlaceholders(scriptContent) {
  let processedContent = scriptContent;
  
  // Replace all {{PLACEHOLDER}} with corresponding env variables
  const placeholderRegex = /\{\{([A-Z_]+)\}\}/g;
  
  processedContent = processedContent.replace(placeholderRegex, (match, key) => {
    const envValue = process.env[key];
    
    if (!envValue) {
      console.warn(`Warning: Environment variable ${key} not found. Placeholder will remain.`);
      return match; // Keep placeholder if env var not found
    }
    
    return envValue;
  });
  
  return processedContent;
}

/**
 * Get all active meta scripts for frontend (with placeholders replaced)
 */
exports.getAllActiveMetaScripts = async (req, res) => {
  try {
    const scripts = await MetaScript.find({ status: 'active' })
      .select('script_name script_type position script_content load_strategy order')
      .sort({ order: 1, createdAt: -1 });

    // Replace placeholders with actual env values
    const processedScripts = scripts.map(script => ({
      _id: script._id,
      script_name: script.script_name,
      script_type: script.script_type,
      position: script.position,
      script_content: replacePlaceholders(script.script_content),
      load_strategy: script.load_strategy,
      order: script.order
    }));

    res.status(200).json(buildSuccObject(200, "Meta scripts retrieved successfully", processedScripts));
  } catch (error) {
    console.error("Error fetching meta scripts:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

/**
 * Get meta scripts by position (head, body-start, body-end)
 */
exports.getMetaScriptsByPosition = async (req, res) => {
  try {
    const { position } = req.params;
    
    if (!['head', 'body-start', 'body-end'].includes(position)) {
      return res.status(400).json(buildErrObject(400, "Invalid position. Must be: head, body-start, or body-end"));
    }

    const scripts = await MetaScript.find({ 
      status: 'active',
      position: position
    })
      .select('script_name script_type script_content load_strategy order')
      .sort({ order: 1, createdAt: -1 });

    // Replace placeholders with actual env values
    const processedScripts = scripts.map(script => ({
      _id: script._id,
      script_name: script.script_name,
      script_type: script.script_type,
      script_content: replacePlaceholders(script.script_content),
      load_strategy: script.load_strategy,
      order: script.order
    }));

    res.status(200).json(buildSuccObject(200, "Meta scripts retrieved successfully", processedScripts));
  } catch (error) {
    console.error("Error fetching meta scripts:", error);
    res.status(500).json(buildErrObject(500, error.message));
  }
};

