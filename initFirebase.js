let admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://calendarapp-680df.firebaseio.com",
    storageBucket: 'gs://calendarapp-680df.appspot.com'
});

module.exports = admin