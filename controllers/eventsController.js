let admin = require("../initFirebase.js");
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
                    obj.interestedUsers = interestedUsers;
                    obj.markedGoingUsers = markedGoingUsers;
                    if (attachments) obj.attachments = attachments;
                    eventRef.push(obj);
                    let message = {
                        data: {
                            title: "New Event by " + byName,
                            body: name + ", " + date + " " + time
                        },
                        android: {
                            notification: {
                                title: "New Event by " + byName,
                                body: name + ", " + date + " " + time,
                                image: userRecord.photoURL
                            }
                        },
                        topic: "Event"
                    };
                    admin.messaging().send(message)
                        .then((response) => {
                            console.log("Successfully sent message:", response);
                        })
                        .catch((error) => {
                            console.log("Error sending message:", error);
                        });
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

module.exports = router;