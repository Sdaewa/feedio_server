const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const dotenv = require("dotenv");

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

function sendEmail({ to, subject, html }) {
  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: to,
    subject: subject,
    html: html,
  };

  transporter.sendMail(mailOptions, function (err, data) {
    if (err) {
      console.log("Error:", err);
    } else {
      console.log("Email sent successfully");
    }
  });
}

async function sendAdminNotificationEmail(review) {
  try {
    const templatePath = path.join(
      __dirname,
      "../public/templates/new-review.hbs"
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
      reviewContent: review.content,
      reviewRating: review.rating,
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
      "../public/templates/welcome-email.hbs"
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
    "../public/templates/update-email.hbs"
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

module.exports = {
  sendEmail,
  sendAdminNotificationEmail,
  sendAccountCreationEmail,
  sendAccountUpdateEmail,
};
