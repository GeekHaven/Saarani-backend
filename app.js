let admin = require("firebase-admin");
let express = require('express')
let app = express()
let port = process.env.PORT || 3000
let bodyParser = require('body-parser')
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://calender-app-b8f90.firebaseio.com"
});

var db = admin.database();
var ref = db.ref("/");

app.get('/events', (req, res) => {
    let eventRef = ref.child("events").once("value", (snapshot) => {
        res.json(snapshot.val());
    }, (error) => {
        console.log("The read failed: " + error.code);
        res.json({
            error: error.code
        });
    });
})

app.get('/events/:id', (req, res) => {
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
        console.log("The read failed: " + error.code);
        res.json({
            error: error.code
        });
    })
})

app.post('/events', (req, res) => {
    let idToken = req.body.token;
    admin.auth().verifyIdToken(idToken)
        .then(function (decodedToken) {
            let uid = decodedToken.uid;
            admin.auth().getUser(uid)
                .then(function (userRecord) {
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
                    res.json(obj);
                })
                .catch(function (error) {
                    console.log("Error fetching user data:", error);
                    res.json({
                        error: error.code
                    });
                });
        }).catch(function (error) {
            console.log(error);
            res.json({
                error: error.code
            });
        });

})


app.delete('/events/:id', (req, res) => {
    let idToken = req.body.token;
    admin.auth().verifyIdToken(idToken)
        .then((decodedToken) => {
            let uid = decodedToken.uid;
            admin.auth().getUser(uid)
                .then((userRecord) => {
                    let eventRef = db.ref(`events/${req.params.id}`).once("value", snapshot => {
                        if (snapshot.exists()) {
                            var event = snapshot.val()
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
                        console.log("The read failed: " + error.code);
                        res.json({
                            error: error.code
                        });
                    })
                })
                .catch(function (error) {
                    console.log(error);
                    res.json({
                        error: error.code
                    });
                });
        })
        .catch(function (error) {
            console.log(error);
            res.json({
                error: error.code
            });
        });
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))