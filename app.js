var admin = require("firebase-admin");
const express = require('express')
const app = express()
const port = process.env.PORT || 3000
var bodyParser = require('body-parser')
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

app.get('/events', function(req, res) {
    var eventRef = ref.child("events");
    eventRef.once("value", function(snapshot) {
        res.json(snapshot.val());
      }, function (error) {
        console.log("The read failed: " + error.code);
        res.json({error: error.code});
      });
})

app.get('/events/:id', function(req, res) {
    var eventRef = ref.child("events");
    eventRef.once("value", function(snapshot) {
        res.json(snapshot.val()[req.params.id]);
      }, function (error) {
        console.log("The read failed: " + error.code);
        res.json({error: error.code});
      });
})

app.post('/events', function (req, res) {
    var idToken = req.body.token;
    admin.auth().verifyIdToken(idToken)
        .then(function (decodedToken) {
            let uid = decodedToken.uid;
            admin.auth().getUser(uid)
                .then(function (userRecord) {
                    var name = req.body.name;
                    var byID = userRecord.uid;
                    var byName = userRecord.displayName;
                    var desc = req.body.desc;
                    var venue = req.body.venue;
                    var date = req.body.date;
                    var time = req.body.time;
                    var interestedUsers = {};
                    var markedGoingUsers = {};
                    var attachments = req.body.attachments;
                    var eventRef = ref.child("events");
                    var obj = {};
                    obj.name = name;
                    obj.byID = byID;
                    obj.byName = byName;
                    obj.desc = desc;
                    obj.venue = venue;
                    obj.date = date;
                    obj.time = time;
                    obj.interestedUsers = interestedUsers;
                    obj.markedGoingUsers = markedGoingUsers;
                    if(attachments) obj.attachments = attachments;
                    eventRef.push(obj);
                    res.json(obj);
                })
                .catch(function (error) {
                    console.log('Error fetching user data:', error);
                    res.json({error: error.code});
                });
        }).catch(function (error) {
            console.log(error);
            res.json({error: error.code});
        });

})


app.delete('/events/:id', (req, res) => {
    var idToken = req.body.token;
    admin.auth().verifyIdToken(idToken)
        .then( (decodedToken) => {
            let uid = decodedToken.uid;
            admin.auth().getUser(uid)
                .then( (userRecord) => {
                    var eventRef = db.ref(`events/${req.params.id}`).once("value", snapshot => {
                        if (snapshot.exists()){
                            var event = snapshot.val()
                            if ( event.byID == userRecord.uid ) {
                                db.ref(`events/${req.params.id}`).remove()
                            }
                            else{
                                console.log("Not Authorized")
                            }
                        }
                        else{
                            console.log("Event does not exists")
                        }
                    })
                })
                .catch(function (error) {
                    console.log(error);
                    res.json({error: error.code});
                });
        })
        .catch(function (error) {
            console.log(error);
            res.json({error: error.code});
        });
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))