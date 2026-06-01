import nodemailer from "nodemailer";
import { resolveSiteOrigin } from "@/lib/matchShare";

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_FROM &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS,
  );
}

function createTransporter() {
  const port = Number(process.env.SMTP_PORT ?? "587");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendMail(input: SendMailInput): Promise<void> {
  if (!smtpConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[email] SMTP not configured. Would send:", {
        to: input.to,
        subject: input.subject,
        text: input.text,
      });
      return;
    }
    throw new Error("SMTP is not configured");
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  temporaryPassword: string,
): Promise<void> {
  const settingsUrl = `${resolveSiteOrigin()}/settings`;
  const subject = "CardMatch 密碼重設通知";
  const text = [
    "你好，",
    "",
    "我們已為你的 CardMatch 帳號產生一組暫時密碼：",
    temporaryPassword,
    "",
    "請使用此密碼登入後，立即前往「設定」頁面更改為你自己記得住的密碼：",
    settingsUrl,
    "",
    "若你沒有申請重設密碼，請盡快登入並修改密碼，或聯絡我們。",
    "",
    "— CardMatch",
  ].join("\n");

  const html = `
    <p>你好，</p>
    <p>我們已為你的 CardMatch 帳號產生一組<strong>暫時密碼</strong>：</p>
    <p style="font-size:18px;font-family:monospace;letter-spacing:0.05em;padding:12px;background:#f4f4f5;border-radius:8px;display:inline-block">${temporaryPassword}</p>
    <p>請使用此密碼登入後，立即前往<a href="${settingsUrl}">設定</a>頁面更改為你自己記得住的密碼。</p>
    <p style="color:#737373;font-size:14px">若你沒有申請重設密碼，請盡快登入並修改密碼。</p>
    <p>— CardMatch</p>
  `.trim();

  await sendMail({ to, subject, text, html });
}
