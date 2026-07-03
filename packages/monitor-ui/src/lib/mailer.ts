import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  return transporter.sendMail({
    from: `${process.env.SMTP_FROM_NAME ?? "CIG Monitor"} <${process.env.SMTP_FROM_ADDRESS}>`,
    ...opts,
  });
}
