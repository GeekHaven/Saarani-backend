var nodemailer = require('nodemailer');
var emailCredentials = require('../emailCredential.json')

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: emailCredentials
});

function sendEmail(recipients, data, operation) {
    let text = data.byName + " is hosting an event " + data.name + "\n\n" + data.desc + "\n\nDate: " + data.date + "\nTime: " + data.time + "\nVenue: " + data.venue + "\n\nSee you there! Refer to the app for possible attachmments or to mark yourself interested.";
    let html = data.byName + " is hosting an event <b>" + data.name + "</b><br/><br/>" + data.desc + "<br/><br/><b>Date:</b> " + data.date + "<br/><b>Time:</b> " + data.time + "<br/><b>Venue:</b> " + data.venue + "<br/><br/>See you there! Refer to the app for possible attachmments or to mark yourself interested.";
    if(operation === "Event Cancelled: ") {
      text = data.name + " being hosted by " + data.byName + " on " + data.date + " " + data.time + " has been CANCELLED.\n\nWe apologize for any inconvenience.";
      html = data.name + " being hosted by " + data.byName + " on " + data.date + " " + data.time + " <b>has been CANCELLED</b>.<br/><br/>We apologize for any inconvenience.";
    }
    if(operation === "Event Attendees Updated: ") {
      text = data.name + " being hosted by " + data.byName + " on " + data.date + " " + data.time + " is no longer meant for you\n\nWe apologize for any inconvenience.";
      html = data.name + " being hosted by " + data.byName + " on " + data.date + " " + data.time + " <b>is no longer meant for you</b>.<br/><br/>We apologize for any inconvenience.";
    }
    var mailOptions = {
        from: 'testsaarani@gmail.com',
        to: recipients,
        subject: operation + data.name + " by " + data.byName,
        text: text,
        html: html
      };

      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
}

module.exports = sendEmail;