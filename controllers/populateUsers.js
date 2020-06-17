let admin = require("../initFirebase.js");
const db = admin.database();

var populateUsers = (userRecord) => {
    var userRef = db.ref('users/').orderByChild("uid").equalTo(userRecord.uid).once("value", (snapshot) => {
        if (snapshot.exists()) {
            console.log("User already exists")
        } else {
            var user = userRecord.toJSON()
            var re = /([a-z]){3}([0-9]){7}/g
            var obj = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName
            }
            if (re.test(user.email)) {
                obj.type = "student"
            } else {
                obj.type = "society"
            }
            admin.database().ref('users/').push(obj);
        }
    })
}

module.exports = populateUsers