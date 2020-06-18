let admin = require("../initFirebase.js");
let sendNotification = require("../utilities/sendNotification.js")
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
                    let interestedUsers = {};
                    let markedGoingUsers = {};
                    let attachments = req.body.attachments;
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
                    eventRef.push(obj);
                    sendNotification("New Event by " + byName, name + ", " + date + " " + time, userRecord.photoURL, "Event");
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
                                sendNotification(event.name + " has been cancelled", "Updated by " + event.byName, userRecord.photoURL, "Event");
                                db.ref(`events/${req.params.id}`).remove();
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

module.exports = router;