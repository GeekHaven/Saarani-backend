let admin = require("../initFirebase.js");

function sendNotification(title, body, image, subtext, topic, del=false) {
    let message = {}
    if(!del) {
        message = {
            data: {
                title: title,
                body: body,
                image: image,
                subtext: subtext
            },
            topic: topic
        };
    } else {
        message = {
            data: {
                title: title,
                body: body,
                image: image,
                subtext: subtext
            },
            notification: {
                title: title,
                body: body,
                image: image
            },
            topic: topic
        };
    }
    admin.messaging().send(message)
        .then((response) => {
            console.log("Successfully sent message:", response);
        })
        .catch((error) => {
            console.log("Error sending message:", error);
        });
}

module.exports = sendNotification;