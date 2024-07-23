const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const dotenv = require("dotenv");

dotenv.config();

let transporter = nodemailer.createTransport({
  host: "mail.privateemail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

function sendEmail({ to, subject, html }) {
  return new Promise((resolve, reject) => {
    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: to,
      subject: subject,
      html: html,
    };

    transporter.sendMail(mailOptions, function (err, info) {
      if (err) {
        reject(err);
      } else {
        resolve(info);
      }
    });
  });
}

async function sendAdminNotificationEmail(review) {
  try {
    const templatePath = path.join(
      __dirname,
      "../public/emailTemplates/new-review.hbs"
    );
    const cssPath = path.join(__dirname, "../public/styles/new-review.css");

    const source = fs.readFileSync(templatePath, "utf8");
    const cssContent = fs.readFileSync(cssPath, "utf8");

    let htmlWithCSS = source.replace(
      "<style></style>",
      `<style>${cssContent}</style>`
    );

    const template = handlebars.compile(htmlWithCSS);
    const replacements = {
      reviewerName: review.name,
      reviewerEmail: review.email,
      reviewContent: review.feedback,
      reviewRating: review.rating,
      currentYear: new Date().getFullYear(),
    };
    const htmlToSend = template(replacements);
    await sendEmail({
      to: review.userEmail,
      subject: "New Review Submitted!",
      html: htmlToSend,
    });
  } catch (err) {
    console.error("Error in sending admin notification email:", err);
  }
}

async function sendAccountCreationEmail(user) {
  try {
    const templatePath = path.join(
      __dirname,
      "../public/emailTemplates/welcome-email.hbs"
    );
    const cssPath = path.join(__dirname, "../public/styles/welcome-email.css");

    const source = fs.readFileSync(templatePath, "utf8");
    const cssContent = fs.readFileSync(cssPath, "utf8");

    let htmlWithCSS = source.replace(
      "<style></style>",
      `<style>${cssContent}</style>`
    );

    const template = handlebars.compile(htmlWithCSS);
    const replacements = {
      userName: user.name,
      userEmail: user.email,
      membershipStatus: user.membershipStatus,
    };
    const htmlToSend = template(replacements);
    await sendEmail({
      to: user.email,
      subject: "Welcome to Feedio!",
      html: htmlToSend,
    });
  } catch (err) {
    console.error("Error in sending account creation email:", err);
  }
}

async function sendAccountUpdateEmail(
  user,
  { emailUpdated = false, passwordUpdated = false }
) {
  const templatePath = path.join(
    __dirname,
    "../public/emailTemplates/update-email.hbs"
  );
  const cssPath = path.join(__dirname, "../public/styles/update-email.css");

  const source = fs.readFileSync(templatePath, "utf8");
  const cssContent = fs.readFileSync(cssPath, "utf8");

  let htmlWithCSS = source.replace(
    "<style></style>",
    `<style>${cssContent}</style>`
  );

  const template = handlebars.compile(htmlWithCSS);
  const replacements = {
    name: user.name,
    email: user.email,
    emailUpdated,
    passwordUpdated,
    currentYear: new Date().getFullYear(),
  };
  const htmlToSend = template(replacements);

  await sendEmail({
    to: user.email,
    subject: "Your Feedio Account Details Were Updated",
    html: htmlToSend,
  });
}

async function sendPasswordResetEmail(email, resetUrl) {
  try {
    const templatePath = path.join(
      __dirname,
      "../public/emailTemplates/password-reset-email.hbs"
    );
    const cssPath = path.join(
      __dirname,
      "../public/styles/password-reset-email.css"
    );

    const source = fs.readFileSync(templatePath, "utf8");
    const cssContent = fs.readFileSync(cssPath, "utf8");

    let htmlWithCSS = source.replace(
      "<style></style>",
      `<style>${cssContent}</style>`
    );

    const template = handlebars.compile(htmlWithCSS);
    const replacements = {
      resetUrl: resetUrl,
      currentYear: new Date().getFullYear(),
    };
    const htmlToSend = template(replacements);

    await sendEmail({
      to: email,
      subject: "Reset Your Feedio Password",
      html: htmlToSend,
    });
  } catch (err) {
    console.error("Error in sending password reset email:", err);
  }
}

async function sendSubscriptionCreatedEmail(user, subscriptionDetails) {
  try {
    const templatePath = path.join(
      __dirname,
      "../public/emailTemplates/subscription-created-email.hbs"
    );
    const cssPath = path.join(
      __dirname,
      "../public/styles/subscription-created-email.css"
    );

    const source = fs.readFileSync(templatePath, "utf8");
    const cssContent = fs.readFileSync(cssPath, "utf8");

    let htmlWithCSS = source.replace(
      "<style></style>",
      `<style>${cssContent}</style>`
    );

    const template = handlebars.compile(htmlWithCSS);
    const replacements = {
      userName: user.name,
      subscriptionDetails: subscriptionDetails.planName,
      startDate: new Date(
        subscriptionDetails.startDate * 1000
      ).toLocaleDateString(),
      dashboardUrl: `${process.env.CLIENT_URL}/dashboard`,
      currentYear: new Date().getFullYear(),
    };
    const htmlToSend = template(replacements);

    const result = await sendEmail({
      to: user.email,
      subject: "Your Feedio Subscription is Now Active!",
      html: htmlToSend,
    });
  } catch (err) {
    console.error("Error in sending subscription created email:", err);
    console.error("Error details:", err.stack);
    throw err;
  }
}

async function sendSubscriptionCancelledEmail(user) {
  // Similar implementation to sendSubscriptionCreatedEmail
}

async function sendTrialEndingSoonEmail(user, daysLeft) {
  // Implementation for trial ending soon notification
}

async function sendPaymentSucceededEmail(user, paymentDetails) {
  // Implementation for payment succeeded notification
}

async function sendPaymentFailedEmail(user, paymentDetails) {
  // Implementation for payment failed notification
}

async function sendSubscriptionUpdatedEmail(user, updateDetails) {
  // Implementation for subscription updated notification
}

module.exports = {
  sendEmail,
  sendAdminNotificationEmail,
  sendAccountCreationEmail,
  sendAccountUpdateEmail,
  sendPasswordResetEmail,
  sendSubscriptionCreatedEmail,
  sendSubscriptionCancelledEmail,
  sendTrialEndingSoonEmail,
  sendPaymentSucceededEmail,
  sendPaymentFailedEmail,
  sendSubscriptionUpdatedEmail,
};
