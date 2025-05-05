// Firebase.js
var admin = require("firebase-admin");
var serviceAccount = require("./blue-sky-e98e0-firebase-adminsdk-fbsvc-82b430caf7.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// module.exports = db;

module.exports = {
    db : db,
    admin : admin,
};