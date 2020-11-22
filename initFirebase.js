let admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://caliiita-8f11d.firebaseio.com",
    storageBucket: 'gs://caliiita-8f11d.appspot.com'
});

module.exports = admin