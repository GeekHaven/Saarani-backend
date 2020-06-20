let admin = require("../initFirebase.js");

function sendNotification(title, body, image, subtext, topic, del = false) {
    let message = {}
    message = {
        data: {
            title: title,
            body: body,
            image: image,
            subtext: subtext,
            del: (del===true)? '1' : '0'
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