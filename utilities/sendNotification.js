let admin = require("../initFirebase.js");

function sendNotification(title, body, image, topic) {
    let message = {
        data: {
            title: title,
            body: body,
            image: image
        },
        android: {
            notification: {
                title: title,
                body: body,
                image: image
            }
        },
        topic: topic
    };
    admin.messaging().send(message)
        .then((response) => {
            console.log("Successfully sent message:", response);
        })
        .catch((error) => {
            console.log("Error sending message:", error);
        });
}

module.exports = sendNotification;