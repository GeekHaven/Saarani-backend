var nodemailer = require('nodemailer');
var emailCredentials = require('../emailCredential.json')

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: emailCredentials
});

function sendEmail(recipients, data, operation) {
    let text = data.byName + " is hosting an event " + data.name + "\n\n" + data.desc + "\n\nDate: " + data.date + "\nTime: " + data.time + "\nVenue: " + data.venue + "\n\nSee you there! Refer to the app for possible attachmments or to mark yourself interested.";
    if(operation === "[Cancelled] ") {
      text = data.name + " being hosted by " + data.byName + " on " + data.date + " " + data.time + " has been CANCELLED.\n\nWe apologize for any inconvenience.";
    }
    var mailOptions = {
        from: 'testsaarani@gmail.com',
        to: recipients,
        subject: operation + data.name + " by " + data.byName,
        text: text
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