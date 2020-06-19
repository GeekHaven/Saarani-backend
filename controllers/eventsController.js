let admin = require("../initFirebase.js");
let sendNotification = require("../utilities/sendNotification.js")
let sendEmail = require("../utilities/sendEmail.js")
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
    let eventRef = ref.child("events").once("value", (snapshot) => {
        res.json(snapshot.val());
    }, (error) => {
        console.log(`The read failed: ${error.code}`);
        res.json({
            error: error.code
        });
    });
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

router.post('/', (req, res) => {
    let idToken = req.body.token;
    admin.auth().verifyIdToken(idToken)
        .then(decodedToken => {
            let uid = decodedToken.uid;
            admin.auth().getUser(uid)
                .then(userRecord => {
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
                    if (attachments) obj.attachments = attachments;
                    if (emailRecipients) {
                        obj.emailRecipients = emailRecipients;
                        sendEmail(emailRecipients, obj, "New Event: ")
                    }
                    eventRef.push(obj);
                    sendNotification("New Event: " + name, venue + " \n" + date + " \n" + time, userRecord.photoURL, byName, "Event");
                    res.json(obj);
                })
                .catch(error => {
                    console.log("Error fetching user data:", error);
                    res.json({
                        error: error.code
                    });
                });
        }).catch(error => {
            console.log(error);
            res.json({
                error: error.code
            });
        });

})

router.delete('/:id', (req, res) => {
    let idToken = req.body.token;
    admin.auth().verifyIdToken(idToken)
        .then((decodedToken) => {
            let uid = decodedToken.uid;
            admin.auth().getUser(uid)
                .then((userRecord) => {
                    let eventRef = db.ref(`events/${req.params.id}`).once("value", snapshot => {
                        if (snapshot.exists()) {
                            const event = snapshot.val();
                            if (event.byID == userRecord.uid) {
                                let markedBy = event.markedBy;
                                let dbUserIDs = Object.keys(markedBy);
                                dbUserIDs.forEach(dbUserID => {
                                    db.ref(`users/${dbUserID}/marked/${req.params.id}`).remove();
                                })
                                db.ref(`events/${req.params.id}`).remove();
                                if (event.emailRecipients){
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
                .catch(error => {
                    console.log(error);
                    res.json({
                        error: error.code
                    });
                });
        })
        .catch(error => {
            console.log(error);
            res.json({
                error: error.code
            });
        });
})

router.put('/:id', (req, res) => {
    let idToken = req.body.token;
    admin.auth().verifyIdToken(idToken)
        .then(decodedToken => {
            let uid = decodedToken.uid;
            admin.auth().getUser(uid)
                .then(userRecord => {
                    let eventRef = db.ref(`events/${req.params.id}`).once("value", snapshot => {
                        if (snapshot.exists()){
                            const event = snapshot.val();
                            if (event.byID == userRecord.uid) {
                                let updates = {}
                                const location = `/events/${req.params.id}/`
                                updates[location+"name"] = req.body.name
                                updates[location+"desc"] = req.body.desc
                                updates[location+"venue"] = req.body.venue
                                updates[location+"date"] = req.body.date
                                updates[location+"time"] = req.body.time
                                if (req.body.attachments) {
                                    updates[location+"attachments"] = req.body.attachments
                                }
                                let sendEmailTo = [];
                                if (event.emailRecipients){
                                    sendEmailTo = event.emailRecipients
                                }
                                if (req.body.emailRecipients) {
                                    updates[location+"emailRecipients"] = req.body.emailRecipients;
                                    sendEmailTo = sendEmailTo.concat(req.body.emailRecipients)
                                }
                                db.ref().update(updates)
                                let editedEventRef = db.ref(`events/${req.params.id}`).once("value", snapshot => {
                                        if (snapshot.exists() && snapshot.val().emailRecipients){
                                            sendEmail(sendEmailTo, snapshot.val(), "Event Updated: ")
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
                .catch(error => {
                    console.log(error);
                    res.json({
                        error: error.code
                    });
                });
        })
        .catch(error => {
            console.log(error);
            res.json({
                error: error.code
            });
        });
})

router.post('/:id/remind', (req,res) => {
    let idToken = req.body.token;
    admin.auth().verifyIdToken(idToken)
        .then((decodedToken) => {
            let uid = decodedToken.uid;
            admin.auth().getUser(uid)
                .then((userRecord) => {
                    let eventRef = db.ref(`events/${req.params.id}`).once("value", snapshot => {
                        if (snapshot.exists()) {
                            const event = snapshot.val();
                            if (event.byID == userRecord.uid) {
                                if (event.emailRecipients){
                                    sendEmail(event.emailRecipients, event, "Event Reminder: ")
                                }
                                sendNotification("Event Reminder: " + name, venue + " \n" + date + " \n" + time, userRecord.photoURL, byName, "Event");
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
                .catch(error => {
                    console.log(error);
                    res.json({
                        error: error.code
                    });
                });
        })
        .catch(error => {
            console.log(error);
            res.json({
                error: error.code
            });
        });
})

router.post('/:id/mark', (req, res) => {
    let idToken = req.body.token;
    admin.auth().verifyIdToken(idToken)
        .then((decodedToken) => {
            let uid = decodedToken.uid;
            admin.auth().getUser(uid)
                .then((userRecord) => {
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
                .catch(error => {
                    console.log(error);
                    res.json({
                        error: error.code
                    });
                });
        })
        .catch(error => {
            console.log(error);
            res.json({
                error: error.code
            });
        });
})

router.post('/marked', (req, res) => {
    let idToken = req.body.token;
    admin.auth().verifyIdToken(idToken)
        .then((decodedToken) => {
            let uid = decodedToken.uid;
            admin.auth().getUser(uid)
                .then((userRecord) => {
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
                .catch(error => {
                    console.log(error);
                    res.json({
                        error: error.code
                    });
                });
        })
        .catch(error => {
            console.log(error);
            res.json({
                error: error.code
            });
        });
})

module.exports = router;