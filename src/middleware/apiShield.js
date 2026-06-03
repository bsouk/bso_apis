function normalizeOrigin(value) {
  if (!value || typeof value !== "string") return "";
  return value.trim().replace(/\/+$/, "");
}

function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || "";
  return [...new Set(raw.split(",").map(normalizeOrigin).filter(Boolean))];
}

function getConfiguredApiKeys() {
  const raw = process.env.API_KEYS || "";
  return [...new Set(raw.split(",").map((k) => k.trim()).filter(Boolean))];
}

function isProductionLike() {
  return process.env.ENV !== "local" && process.env.NODE_ENV !== "development";
}

function isStrictOriginCheckEnabled() {
  const raw = (process.env.STRICT_ORIGIN_CHECK || "").trim().toLowerCase();
  if (raw === "true") return true;
  if (raw === "false") return false;
  return isProductionLike();
}

function getRequestOrigin(req) {
  const origin = req.get("Origin");
  if (origin) return normalizeOrigin(origin);

  const referer = req.get("Referer");
  if (!referer) return "";

  try {
    return normalizeOrigin(new URL(referer).origin);
  } catch (error) {
    return "";
  }
}

function isAllowedOrigin(origin) {
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.some((item) => item === origin);
}

/** So browsers can read 401/403 JSON when origin is allowed (avoids fake "CORS" errors). */
function applyCorsHeadersIfAllowed(req, res) {
  const origin = req.get("Origin");
  if (!origin) return;
  const normalized = normalizeOrigin(origin);
  if (!isAllowedOrigin(normalized)) return;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin, X-API-KEY, x-api-key"
  );
  res.setHeader("Vary", "Origin");
}

function validateApiShieldConfig() {
  const keys = getConfiguredApiKeys();
  const strictOriginEnabled = isStrictOriginCheckEnabled();

  if (keys.length === 0) {
    return {
      ok: false,
      reason:
        "API_KEYS is empty. Add one or more comma-separated keys in .env.",
    };
  }

  if (strictOriginEnabled && getAllowedOrigins().length === 0) {
    return {
      ok: false,
      reason:
        "ALLOWED_ORIGINS is empty while strict origin check is enabled. Add allowed origins in .env.",
    };
  }

  return { ok: true };
}

function apiShield(req, res, next) {
  const strictOriginEnabled = isStrictOriginCheckEnabled();

  // Allow preflight requests to pass CORS handshake.
  if (req.method === "OPTIONS") {
    return next();
  }

  if (strictOriginEnabled) {
    const requestOrigin = getRequestOrigin(req);
    if (!requestOrigin || !isAllowedOrigin(requestOrigin)) {
      applyCorsHeadersIfAllowed(req, res);
      console.warn(
        "[apiShield] Blocked origin:",
        requestOrigin || "(none)",
        "| allowed:",
        getAllowedOrigins().join(", ") || "(empty)"
      );
      return res.status(403).json({
        error: "Origin is not allowed",
      });
    }
  }

  const apiKey = req.get("x-api-key");
  if (!apiKey) {
    applyCorsHeadersIfAllowed(req, res);
    return res.status(401).json({
      error: "Missing API key",
    });
  }

  const allowedKeys = getConfiguredApiKeys();
  if (!allowedKeys.includes(apiKey.trim())) {
    applyCorsHeadersIfAllowed(req, res);
    return res.status(401).json({
      error: "Invalid API key",
    });
  }

  return next();
}

module.exports = {
  apiShield,
  validateApiShieldConfig,
};
