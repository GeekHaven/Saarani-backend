let admin = require("../initFirebase.js");
let authMiddleware = require("../middlewares/authMiddleware")
let helpers = require("../helpers/helpers")
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

router.get('/:name', (req, res) => {
    const societyRef = db.ref(`societies/${req.params.name}`).once("value", snapshot => {
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

router.get('/:name/events', (req, res) => {
    const societyRef = db.ref(`societies/${req.params.name}`).once("value", snapshot => {
        if (snapshot.exists()) {
            let society = snapshot.val();
            if(!society.uid) {
                console.log("Society hasn't logged in, no events.")
                res.json({});
            } else {
                const eventsRef = db.ref('events').orderByChild("dateTime").once("value", snapshot => {
                    if (snapshot.exists()) {
                        let obj = new Object;
                        snapshot.forEach(child => {
                            let inNumber = helpers.numericCurrentTime();
                            if (child.val().dateTime > inNumber) {
                                return;
                            }
                            if (child.val().byID === society.uid) {
                                obj[child.key] = child.val();
                            }
                        });
                        let revObj = helpers.reverseJSON(obj);
                        res.json(revObj);
                    } else {
                        console.log("Society has no events");
                        res.json({});
                    }
                }, (error) => {
                    console.log(`The read failed: ${error.code}`);
                    res.json({
                        error: error.code
                    });
                })
            }
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

router.post('/check', authMiddleware, (req, res) => {
    let userRecord = res.locals.userRecord;
    let societyRef = db.ref(`societies`).once("value", snapshot => {
        if (snapshot.exists()) {
            let societies = snapshot.val();
            let initials = userRecord.email.split(/[.@]+/).filter(n => n in societies);
            if (initials.length) {
                console.log(initials)
                initials = initials[0];
                if (!societies[initials].uid) {
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
        }
    })
})

module.exports = router;