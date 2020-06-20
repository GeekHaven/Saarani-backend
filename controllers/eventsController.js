let admin = require("../initFirebase.js");
let sendNotification = require("../utilities/sendNotification.js")
let sendEmail = require("../utilities/sendEmail.js")
let authMiddleware = require("../middlewares/authMiddleware")
const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");

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
        var eventRef = db.ref(`events/`).once("value", (snapshot) => {
            let eventsWithkey = {};
            let events = snapshot.val();
            let eventsIDs = Object.keys(events);
            eventsIDs.forEach(eventID => {
                    if (events[eventID].keys){
                        if (events[eventID].keys[key]){
                            eventsWithkey[eventID] = events[eventID];
                        }
                    }
            })
            res.json(eventsWithkey);
        }, (error) => {
            console.log(`The read failed: ${error.code}`);
            res.json({
                error: error.code
            });
        }) 
    } else {
        var eventRef = ref.child("events").once("value", (snapshot) => {
            res.json(snapshot.val());
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
    let name = req.body.name;
    let byID = userRecord.uid;
    let byName = userRecord.displayName;
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
    obj.desc = desc;
    obj.venue = venue;
    obj.date = date;
    obj.time = time;
    let keys = new Array;
    let objKeys = {}
    let keysName = name.toLowerCase().split(" ");
    let keysDesc = desc.toLowerCase().split(" ");
    keys = keys.concat(keysName); keys = keys.concat(keysDesc);
    keys.forEach(key => {
        objKeys[key] = true;
    })
    obj.keys = objKeys;
    if (attachments) obj.attachments = attachments;
    if (emailRecipients) {
        obj.emailRecipients = emailRecipients;
        sendEmail(emailRecipients, obj, "New Event: ")
    }
    eventRef.push(obj);
    sendNotification("New Event: " + name, venue + " \n" + date + " \n" + time, userRecord.photoURL, byName, "Event");
    res.json(obj);
})

router.delete('/:id', authMiddleware, (req, res) => {
    let userRecord = res.locals.userRecord;
    let eventRef = db.ref(`events/${req.params.id}`).once("value", snapshot => {
        if (snapshot.exists()) {
            const event = snapshot.val();
            if (event.byID == userRecord.uid) {
                let markedBy = event.markedBy;
                if (markedBy) {
                    let dbUserIDs = Object.keys(markedBy);
                    dbUserIDs.forEach(dbUserID => {
                        db.ref(`users/${dbUserID}/marked/${req.params.id}`).remove();
                    })
                }
                db.ref(`events/${req.params.id}`).remove();
                if (event.emailRecipients) {
                    sendEmail(event.emailRecipients, event, "Event Cancelled: ")
                }
                sendNotification("Event Cancelled: " + event.name, "Update from " + event.byName, userRecord.photoURL, event.byName, "Event", true);
                res.sendStatus(200);
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
                if (req.body.attachments) {
                    updates[location + "attachments"] = req.body.attachments
                }
                let oldRecipients = event.emailRecipients
                let newRecipients = req.body.emailRecipients;
                let eventCancelledFor = {};
                if(oldRecipients) {
                    if(newRecipients) {
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
                let keys = new Array;
                let objKeys = {}
                let keysName = req.body.name.toLowerCase().split(" ");
                let keysDesc = req.body.desc.toLowerCase().split(" ");
                keys = keys.concat(keysName); keys = keys.concat(keysDesc);
                keys.forEach(key => {
                    objKeys[key] = true;
                })
                updates[location + "keys"] = objKeys;
                db.ref().update(updates)
                let editedEventRef = db.ref(`events/${req.params.id}`).once("value", snapshot => {
                    if (snapshot.exists()) {
                        console.log(eventCancelledFor)
                        if (newRecipients) sendEmail(newRecipients, snapshot.val(), "Event Updated: ")
                        if (eventCancelledFor.length) sendEmail(eventCancelledFor, snapshot.val(), "Event Attendees Updated: ")
                    }
                })
                sendNotification("Event Updated: " + req.body.name, req.body.venue + " \n" + req.body.date + " \n" + req.body.time, userRecord.photoURL, event.byName, "Event");
                res.sendStatus(200);
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
                if (event.emailRecipients) {
                    sendEmail(event.emailRecipients, event, "Event Reminder: ")
                }
                sendNotification("Event Reminder: " + event.name, event.venue + " \n" + event.date + " \n" + event.time, userRecord.photoURL, event.byName, "Event");
                res.sendStatus(200);
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

router.post('/:id/mark', (req, res) => {
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
                    res.sendStatus(200);
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
                error: "Event does not exists"
            })
        }
    })
})

router.post('/marked', (req, res) => {
    let userRecord = res.locals.userRecord;
    const userRef = db.ref('users/').orderByChild("uid").equalTo(userRecord.uid).once("value", (snapshot) => {
        if (snapshot.exists()) {
            let dbUserID = Object.keys(snapshot.val())[0];
            let interestedEvents = snapshot.val()[dbUserID].marked;
            let eventRef = ref.child("events").once("value", (snapshot) => {
                let message = {};
                Object.keys(interestedEvents).forEach(eventKey => {
                    message[eventKey] = snapshot.val()[eventKey];
                    message[eventKey].markedAs = interestedEvents[eventKey];
                })
                res.json(message);
            }, (error) => {
                console.log(`The read failed: ${error.code}`);
                res.json({
                    error: error.code
                });
            });
        } else {
            console.log("User does not exist")
            res.json({
                error: "User does not exist"
            })
        }
    })
})

module.exports = router;