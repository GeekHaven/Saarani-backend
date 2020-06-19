var nodemailer = require('nodemailer');
var emailCredentials = require('../emailCredential.json')

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: emailCredentials
});

function sendEmail(recipients, data, operation) {
    var mailOptions = {
        from: 'testsaarani@gmail.com',
        to: recipients,
        subject: operation + data.name + " by " + data.byName,
        text: JSON.stringify(data)
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