const passport = require('passport')
const mongoose = require('mongoose')
const User = require('../models/user')
const Admin = require('../models/admin')
const JwtStrategy = require('passport-jwt').Strategy
const utils = require('../utils/utils')

/**
 * Extracts token from: header, body or query
 * @param {Object} req - request object
 * @returns {string} token - decrypted token
 */

const jwtExtractor = req => {
  let token = null
  if (req.headers.authorization) {
    token = req.headers.authorization.replace('Bearer ', '').trim()
  } else if (req.body.token) {
    token = req.body.token.trim()
  } else if (req.query.token) {
    token = req.query.token.trim()
  }
  if (token) {
    token = utils.decrypt(token)
  }
  return token
}

/**
 * Options object for jwt middlware
 */

const jwtOptions = {
  jwtFromRequest: jwtExtractor,
  secretOrKey: process.env.JWT_SECRET
}

/**
 * Login with JWT middleware
 */
const jwtLogin = new JwtStrategy(jwtOptions, (payload, done) => {
  console.log("=== Passport JWT Strategy Debug ===");
  console.log("Payload:", payload);
  console.log("Payload data:", payload?.data);
  console.log("Payload data type:", payload?.data?.type);
  console.log("Payload data _id:", payload?.data?._id);

  if (!payload || !payload.data || !payload.data._id) {
    console.error("Invalid payload structure");
    return done(null, false, { message: "Invalid token payload" });
  }

  let collection = payload.data.type == "admin" ? Admin : User
  
  // Convert _id to ObjectId if it's a string
  let userId;
  try {
    if (typeof payload.data._id === 'string') {
      userId = new mongoose.Types.ObjectId(payload.data._id);
    } else {
      userId = payload.data._id;
    }
  } catch (err) {
    console.error("Invalid user ID in token:", payload.data._id, err);
    return done(null, false, { message: "Invalid user ID in token" });
  }
  
  console.log("Looking up user with ID:", userId);
  collection.findOne({
    _id: userId
  }).then(user => {
    console.log("User found in database:", user ? "Yes" : "No");
    if (user) {
      console.log("User email:", user.email);
      console.log("User _id:", user._id);
    }
    
    if (!user) {
      console.error("User not found in database with ID:", payload.data._id);
      return done(null, false, { message: "User not found" });
    }

    if (payload.data.type === "user" && user.member_status === "suspend") {
      console.error("User account is suspended");
      return done(null, false, { message: "Account suspended" });
    }

    console.log("Authentication successful for user:", user.email);
    return done(null, user);
  }).catch(err => {
    console.error("Passport JWT Strategy error:", err);
    return done(err, false)
  })
})

passport.use(jwtLogin)