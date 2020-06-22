let admin = require("../initFirebase.js");
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
    const eventsRef = db.ref('events').orderByChild("dateTime").once("value", snapshot => {
        if (snapshot.exists()) {
            let obj = new Object;
            snapshot.forEach(function(child) {
                let time = new Date().toString().split(/[ :]/g);
                let isoTime = new Date().toISOString().split(/[-T]/g);
                let inNumber = -1 * Number(isoTime[0]+isoTime[1]+isoTime[2]+time[4]+time[5]);
                if (child.val().dateTime > inNumber) {
                    return;
                }
                if (child.val().byID == req.params.uid){
                    obj[child.key] = child.val();
                }
            });
            let revObj = new Object;
            let objKeys = Object.keys(obj);
            for (var i=objKeys.length-1; i>=0; i--){
                revObj[objKeys[i]] = obj[objKeys[i]];
            }
            res.json(revObj);
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

module.exports = router;