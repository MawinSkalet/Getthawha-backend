import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";

const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.mail.me.com",
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: process.env.EMAIL, // usually your @icloud.com Apple ID
    pass: process.env.EMAIL_PASSWORD, // app-specific password
  },
  requireTLS: !smtpSecure,
  // connection hygiene
  pool: true,
  maxConnections: 3,
  maxMessages: 50, // rotate before server gets grumpy
  tls: {
    // leave defaults; don't accept self-signed certs
    minVersion: "TLSv1.2",
  },
});

async function sendUserNotification(userId, message) {
  // Google users do not have a LINE recipient ID.
  if (!/^U[0-9a-f]{32}$/i.test(userId || "")) return;
  //if dont have message channel access token, return
  if (!process.env.MESSAGE_CHANNEL_ACCESS_TOKEN) {
    console.log("No MESSAGE_CHANNEL_ACCESS_TOKEN found");
    return;
  }

  await axios.post(
    "https://api.line.me/v2/bot/message/push",
    {
      to: userId,
      messages: [
        {
          type: "text",
          text: message,
        },
      ],
    },
    {
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MESSAGE_CHANNEL_ACCESS_TOKEN}`,
        "X-Line-Retry-Key": uuidv4(),
      },
    }
  );
}

async function sendEmailNotification(subject, text, emails) {
  const recipients = [...new Set((emails || [])
    .map((email) => String(email || "").trim().toLowerCase())
    .filter(Boolean))];

  if (recipients.length === 0) {
    console.warn("No email recipients configured for notification");
    return { sent: [], failed: [], skipped: [] };
  }

  if (!process.env.EMAIL || !process.env.EMAIL_PASSWORD) {
    console.log("No EMAIL or EMAIL_PASSWORD found");
    return { sent: [], failed: [], skipped: recipients };
  }

  const sent = [];
  const failed = [];
  const sender = process.env.CUSTOM_EMAIL || process.env.EMAIL;

  // Send separate messages so recipients cannot see one another's addresses.
  for (const email of recipients) {

    const mailOptions = {
      from: sender,
      to: email,
      subject,
      text,
      envelope: {
        from: sender,
        to: email,
      },
    };

    // Send the email

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${email}`);
      sent.push(email);
    } catch (error) {
      console.error(`Error sending email to ${email}:`, error);
      failed.push(email);
    }
  }

  return { sent, failed, skipped: [] };
}

export { sendUserNotification, sendEmailNotification };
