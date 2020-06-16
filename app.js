let admin = require("./initFirebase.js");
let express = require('express')
let app = express()
let port = process.env.PORT || 3000
let bodyParser = require('body-parser')
let eventsController = require('./controllers/eventsController')
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

const db = admin.database();
const ref = db.ref("/");

app.use("/events", eventsController);

app.listen(port, () => console.log(`Calendar app listening at http://localhost:${port}`))