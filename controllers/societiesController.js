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
    let societyRef = ref.child("societies").once("value", (snapshot) => {
        res.json(snapshot.val());
    }, (error) => {
        console.log(`The read failed: ${error.code}`);
        res.json({
            error: error.code
        });
    });
})

router.get('/:uid', (req, res) => {
    const societyRef = db.ref('societies/').orderByChild("uid").equalTo(req.params.uid).once("value", snapshot => {
        if (snapshot.exists()) {
            let society = snapshot.val();
            res.json(society)
        } else {
            console.log("Society does not exist");
            res.json({
                error: "Society does not exist"
            });
        }
    }, (error) => {
        console.log(`The read failed: ${error.code}`);
        res.json({
            error: error.code
        });
    })
})

router.get('/:uid/events', (req, res) => {
    const eventsRef = db.ref('events/').orderByChild("byID").equalTo(req.params.uid).once("value", snapshot => {
        if (snapshot.exists()) {
            let events = snapshot.val();
            res.json(events)
        } else {
            console.log("Society does not exist or has no events.");
            res.json({
                error: "Society does not exist or has no events."
            });
        }
    }, (error) => {
        console.log(`The read failed: ${error.code}`);
        res.json({
            error: error.code
        });
    })
})

router.post('/check', (req, res) => {
    let idToken = req.body.token;
    admin.auth().verifyIdToken(idToken)
        .then(decodedToken => {
            let uid = decodedToken.uid;
            admin.auth().getUser(uid)
                .then(userRecord => {
                    const initials = userRecord.email.split("@")[0].split(".")[0];
                    let societyRef = db.ref(`societies/${initials}`).once("value", snapshot => {
                        if (snapshot.exists()) {
                            let society = snapshot.val()
                            if (!society.uid) {
                                const updates = {};
                                updates[`/societies/${initials}/uid`] = userRecord.uid;
                                db.ref().update(updates);
                            }
                            res.json({
                                society: true,
                                uid: userRecord.uid
                            })
                        } else {
                            const userRef = db.ref('users/').orderByChild("uid").equalTo(userRecord.uid).once("value", (snapshot) => {
                                if (snapshot.exists()) {
                                    console.log("User already exists")
                                    console.log(snapshot.val())
                                    res.json({
                                        society: false,
                                        uid: userRecord.uid
                                    })
                                } else {
                                    const user = userRecord.toJSON();
                                    const obj = {
                                        uid: user.uid,
                                        email: user.email,
                                        displayName: user.displayName
                                    };
                                    admin.database().ref('users/').push(obj);
                                    res.json({
                                        society: false,
                                        uid: user.uid
                                    })
                                }
                            });
                        }
                    })
                })
                .catch(error => {
                    console.log(error);
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
        })
})

module.exports = router;