let admin = require("../initFirebase.js");
let sendNotification = require("../utilities/sendNotification.js")
let sendEmail = require("../utilities/sendEmail.js")
let authMiddleware = require("../middlewares/authMiddleware")
let helpers = require("../helpers/helpers")
const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const bucket = admin.storage().bucket();

router.use(bodyParser.urlencoded({
    extended: true
}));
router.use(bodyParser.json());

const db = admin.database();
const ref = db.ref("/");

router.get('/', (req, res) => {
    let key = req.query.key;
    if (key) {
        key = String(key).toLowerCase();
        var eventRef = db.ref(`events`).orderByChild("dateTime").once("value", (snapshot) => {
            let obj = new Object;
            snapshot.forEach(child => {
                let inNumber = helpers.numericCurrentTime();
                if (child.val().dateTime > inNumber) {
                    return;
                }
                if (child.val().keys) {
                    if (child.val().keys[key]) {
                        obj[child.key] = child.val();
                    }
                }
            });
            let revObj = helpers.reverseJSON(obj);
            res.json(revObj);
        }, (error) => {
            console.log(`The read failed: ${error.code}`);
            res.json({
                error: error.code
            });
        })
    } else {
        var eventRef = db.ref("events").orderByChild("dateTime").once("value", (snapshot) => {
            let obj = new Object;
            snapshot.forEach(child => {
                let inNumber = helpers.numericCurrentTime();
                if (child.val().dateTime > inNumber) {
                    return;
                }
                obj[child.key] = child.val();
            });
            let revObj = helpers.reverseJSON(obj);
            res.json(revObj);
        }, (error) => {
            console.log(`The read failed: ${error.code}`);
            res.json({
                error: error.code
            });
        });
    }
})

router.get('/:id', (req, res) => {
    let eventRef = db.ref(`events/${req.params.id}`).once("value", snapshot => {
        if (snapshot.exists()) {
            let event = snapshot.val();
            res.json(event)
        } else {
            console.log("Event does not exist");
            res.json({
                error: "Event does not exist"
            });
        }
    }, (error) => {
        console.log(`The read failed: ${error.code}`);
        res.json({
            error: error.code
        });
    })
})

router.post('/', authMiddleware, (req, res) => {
    let userRecord = res.locals.userRecord;
    let societyRef = db.ref(`societies`).once("value", snapshot => {
        if (snapshot.exists()) {
            let societies = snapshot.val();
            let initials = userRecord.email.split(/[.@]+/).filter(n => n in societies);
            if (initials.length) {
                console.log(initials)
                let socTopic = initials[0];
                let name = req.body.name;
                let byID = userRecord.uid;
                let byName = userRecord.displayName;
                let photoURL = userRecord.photoURL;
                let desc = req.body.desc;
                let venue = req.body.venue;
                let date = req.body.date;
                let time = req.body.time;
                let attachments = req.body.attachments;
                let emailRecipients = req.body.emailRecipients;
                let eventRef = ref.child("events");
                let obj = {};
                obj.name = name;
                obj.byID = byID;
                obj.byName = byName;
                obj.photoURL = photoURL;
                obj.desc = desc;
                obj.venue = venue;
                obj.date = date;
                obj.time = time;
                obj.dateTime = helpers.dateTimeNum(date, time);
                obj.keys = helpers.getKeysObj(name, desc, userRecord.email);
                if (attachments) obj.attachments = attachments;
                if (emailRecipients) {
                    obj.emailRecipients = emailRecipients;
                    sendEmail(emailRecipients, obj, "New Event: ")
                }
                let newEventRef = eventRef.push();
                let newEventID = newEventRef.key;
                newEventRef.set(obj);
                console.log("Sending notification to " + socTopic);
                sendNotification("New Event: " + name, venue + " \n" + date + " \n" + time, userRecord.photoURL, byName, socTopic, newEventID);
                res.json(obj);
            } else {
                console.log("Not a Society");
                res.json({
                    error: "Not a Society"
                });
            }
        } else {
            console.log("No societies in database.");
            res.json({
                error: "No societies in database."
            });
        }
    })


})

router.post('/:id/delete', authMiddleware, (req, res) => {
    let userRecord = res.locals.userRecord;
    let eventRef = db.ref(`events/${req.params.id}`).once("value", snapshot => {
        if (snapshot.exists()) {
            const event = snapshot.val();
            if (event.byID == userRecord.uid) {
                let socTopic = "Event";
                let markedBy = event.markedBy;
                if (markedBy) {
                    let dbUserIDs = Object.keys(markedBy);
                    dbUserIDs.forEach(dbUserID => {
                        db.ref(`users/${dbUserID}/marked/${req.params.id}`).remove();
                    })
                }
                let attachments = event.attachments;
                if (attachments) {
                    for (let fileName in attachments) {
                        let fileURL = attachments[fileName];
                        let file = fileURL.split("files%2F")[1].split("?alt")[0];
                        try {
                            bucket.file("files/" + file).delete();
                        } catch (error) {
                            console.log(error);
                        }
                    }
                }
                db.ref(`events/${req.params.id}`).remove();
                if (event.emailRecipients) {
                    sendEmail(event.emailRecipients, event, "Event Cancelled: ")
                }
                db.ref(`societies`).once("value", snapshot => {
                    if (snapshot.exists()) {
                        let societies = snapshot.val();
                        let initials = userRecord.email.split(/[.@]+/).filter(n => n in societies);
                        if (initials.length) {
                            console.log(initials);
                            socTopic = initials[0];
                        }
                    }
                    console.log("Sending notification to " + socTopic);
                    sendNotification("Event Cancelled: " + event.name, "Update from " + event.byName, userRecord.photoURL, event.byName, socTopic, req.params.id, true);
                    res.json({
                        status: "200"
                    });
                });
            } else {
                console.log("Not Authorized");
                res.json({
                    error: "Not Authorized"
                });
            }
        } else {
            console.log("Event does not exist");
            res.json({
                error: "Event does not exist"
            });
        }
    }, (error) => {
        console.log(`The read failed: ${error.code}`);
        res.json({
            error: error.code
        });
    })
})

router.put('/:id', authMiddleware, (req, res) => {
    let userRecord = res.locals.userRecord;
    let eventRef = db.ref(`events/${req.params.id}`).once("value", snapshot => {
        if (snapshot.exists()) {
            const event = snapshot.val();
            if (event.byID == userRecord.uid) {
                let updates = {}
                const location = `/events/${req.params.id}/`
                updates[location + "name"] = req.body.name
                updates[location + "desc"] = req.body.desc
                updates[location + "venue"] = req.body.venue
                updates[location + "date"] = req.body.date
                updates[location + "time"] = req.body.time
                updates[location + "dateTime"] = helpers.dateTimeNum(req.body.date, req.body.time);
                if (req.body.attachments) {
                    updates[location + "attachments"] = req.body.attachments
                }
                let socTopic = "Event";
                let oldRecipients = event.emailRecipients
                let newRecipients = req.body.emailRecipients;
                let eventCancelledFor = {};
                if (oldRecipients) {
                    if (newRecipients) {
                        eventCancelledFor = oldRecipients.filter(n => !newRecipients.includes(n));
                    } else {
                        eventCancelledFor = oldRecipients;
                    }
                }
                if (newRecipients) {
                    updates[location + "emailRecipients"] = newRecipients;
                } else {
                    if (oldRecipients) {
                        db.ref(location + "emailRecipients").remove()
                    }
                }
                updates[location + "keys"] = helpers.getKeysObj(req.body.name, req.body.desc, userRecord.email);;
                db.ref().update(updates)
                let editedEventRef = db.ref(`events/${req.params.id}`).once("value", snapshot => {
                    if (snapshot.exists()) {
                        console.log(eventCancelledFor)
                        if (newRecipients) sendEmail(newRecipients, snapshot.val(), "Event Updated: ")
                        if (eventCancelledFor.length) sendEmail(eventCancelledFor, snapshot.val(), "Event Attendees Updated: ")
                    }
                })
                db.ref(`societies`).once("value", snapshot => {
                    if (snapshot.exists()) {
                        let societies = snapshot.val();
                        let initials = userRecord.email.split(/[.@]+/).filter(n => n in societies);
                        if (initials.length) {
                            console.log(initials);
                            socTopic = initials[0];
                        }
                    }
                    console.log("Sending notification to " + socTopic);
                    sendNotification("Event Updated: " + req.body.name, req.body.venue + " \n" + req.body.date + " \n" + req.body.time, userRecord.photoURL, event.byName, socTopic, req.params.id);
                    res.json({
                        status: "200"
                    });
                });
            } else {
                console.log("Not Authorized")
                res.json({
                    error: "Not Authorized"
                })
            }
        } else {
            console.log("Event does not exist")
            res.json({
                error: "Event does not exist"
            })
        }
    })
})

router.post('/:id/remind', authMiddleware, (req, res) => {
    let userRecord = res.locals.userRecord;
    let eventRef = db.ref(`events/${req.params.id}`).once("value", snapshot => {
        if (snapshot.exists()) {
            const event = snapshot.val();
            if (event.byID == userRecord.uid) {
                let socTopic = "Event";
                if (event.emailRecipients) {
                    sendEmail(event.emailRecipients, event, "Event Reminder: ")
                }
                db.ref(`societies`).once("value", snapshot => {
                    if (snapshot.exists()) {
                        let societies = snapshot.val();
                        let initials = userRecord.email.split(/[.@]+/).filter(n => n in societies);
                        if (initials.length) {
                            console.log(initials);
                            socTopic = initials[0];
                        }
                    }
                    console.log("Sending notification to " + socTopic);
                    sendNotification("Event Reminder: " + event.name, event.venue + " \n" + event.date + " \n" + event.time, userRecord.photoURL, event.byName, socTopic, req.params.id);
                    res.json({
                        status: "200"
                    });
                });
            } else {
                console.log("Not Authorized");
                res.json({
                    error: "Not Authorized"
                });
            }
        } else {
            console.log("Event does not exist");
            res.json({
                error: "Event does not exist"
            });
        }
    }, (error) => {
        console.log(`The read failed: ${error.code}`);
        res.json({
            error: error.code
        });
    })
})

router.post('/:id/mark', authMiddleware, (req, res) => {
    let userRecord = res.locals.userRecord;
    let eventRef = db.ref(`events/${req.params.id}`).once("value", snapshot => {
        if (snapshot.exists()) {
            const userRef = db.ref('users/').orderByChild("uid").equalTo(userRecord.uid).once("value", (snapshot) => {
                if (snapshot.exists()) {
                    console.log(Object.keys(snapshot.val()))
                    let updatesUser = {};
                    let updatesEvent = {};
                    dbEventID = req.params.id;
                    dbUserID = Object.keys(snapshot.val())[0]
                    updatesUser[`/users/${dbUserID}/marked/${dbEventID}`] = req.body.mark;
                    db.ref().update(updatesUser)
                    updatesEvent[`/events/${dbEventID}/markedBy/${dbUserID}`] = req.body.mark;
                    db.ref().update(updatesEvent)
                    res.json({
                        status: "200"
                    });
                } else {
                    console.log("User does not exist")
                    res.json({
                        error: "User does not exist"
                    })
                }
            })
        } else {
            console.log("Event does not exist")
            res.json({
                error: "Event does not exist"
            })
        }
    })
})

router.post('/:id/mark/delete', authMiddleware, (req, res) => {
    let userRecord = res.locals.userRecord;
    let eventRef = db.ref(`events/${req.params.id}`).once("value", snapshot => {
        if (snapshot.exists()) {
            const userRef = db.ref('users/').orderByChild("uid").equalTo(userRecord.uid).once("value", (snapshot) => {
                if (snapshot.exists()) {
                    console.log(Object.keys(snapshot.val()))
                    dbEventID = req.params.id;
                    dbUserID = Object.keys(snapshot.val())[0];
                    db.ref(`/users/${dbUserID}/marked/${dbEventID}`).remove();
                    db.ref(`/events/${dbEventID}/markedBy/${dbUserID}`).remove();
                    res.json({
                        status: "200"
                    });
                } else {
                    console.log("User does not exist")
                    res.json({
                        error: "User does not exist"
                    })
                }
            })
        } else {
            console.log("Event does not exist")
            res.json({
                error: "Event does not exist"
            })
        }
    })
})

router.post('/marked', authMiddleware, (req, res) => {
    let userRecord = res.locals.userRecord;
    let eventRef = ref.child("events").orderByChild("dateTime").once("value", (snapshot) => {
        let obj = new Object;
        snapshot.forEach(child => {
            let inNumber = helpers.numericCurrentTime();
            if (child.val().dateTime > inNumber) {
                return;
            }
            obj[child.key] = child.val();
        });
        let message = helpers.reverseJSON(obj);
        const userRef = db.ref('users/').orderByChild("uid").equalTo(userRecord.uid).once("value", (snapshot) => {
            if (snapshot.exists()) {
                let dbUserID = Object.keys(snapshot.val())[0];
                let interestedEvents = snapshot.val()[dbUserID].marked;
                if (interestedEvents) {
                    Object.keys(interestedEvents).forEach(eventKey => {
                        if (message[eventKey]) {
                            message[eventKey].markedAs = interestedEvents[eventKey];
                        }
                    })
                }
                res.json(message);
            } else {
                res.json(message);
            }
        })
    }, (error) => {
        console.log(`The read failed: ${error.code}`);
        res.json({
            error: error.code
        });
    });

})

module.exports = router;