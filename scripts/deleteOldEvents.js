let admin = require("../initFirebase.js");
let helpers = require("../helpers/helpers")

const db = admin.database();
const ref = db.ref("/");

var eventRef = db.ref("events").orderByChild("dateTime").once("value", (snapshot) => {
    snapshot.forEach(child => {
        let inNumber = helpers.numericCurrentTime();
        if (child.val().dateTime > inNumber) {
            let eventIdRef = db.ref(`events/${child.key}`).once("value", snapshot => {
                if (snapshot.exists()) {
                    const event = snapshot.val();
                    let markedBy = event.markedBy;
                    if (markedBy) {
                        let dbUserIDs = Object.keys(markedBy);
                        dbUserIDs.forEach(dbUserID => {
                            db.ref(`users/${dbUserID}/marked/${child.key}`).remove();
                        })
                    }
                    db.ref(`events/${child.key}`).remove();
                } else {
                    console.log("Event does not exist");
                }
            }, (error) => {
                console.log(`The read failed: ${error.code}`);
            })
        }
    });

}, (error) => {
    console.log(`The read failed: ${error.code}`);
});