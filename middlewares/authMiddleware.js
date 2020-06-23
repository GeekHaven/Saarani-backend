let admin = require("../initFirebase.js");

const authMiddleware = (req, res, next) => {
    let idToken = req.body.token;
    admin.auth().verifyIdToken(idToken)
        .then(decodedToken => {
            let uid = decodedToken.uid;
            admin.auth().getUser(uid)
                .then(userRecord => {
                    res.locals.userRecord = userRecord;
                    next();
                })
                .catch(error => {
                    console.log("Error fetching user data:", error);
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
}

module.exports = authMiddleware;