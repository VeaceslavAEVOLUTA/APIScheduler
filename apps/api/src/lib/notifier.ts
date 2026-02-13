import nodemailer from "nodemailer";
import { config } from "../config.js";

export type NotificationPayload = {
  title: string;
  message: string;
};

export async function sendNotification(channel: { type: string; config: any }, payload: NotificationPayload) {
  switch (channel.type) {
    case "EMAIL":
      return sendEmail(channel.config, payload);
    case "SLACK":
      return sendSlack(channel.config, payload);
    case "TELEGRAM":
      return sendTelegram(channel.config, payload);
    case "DISCORD":
      return sendDiscord(channel.config, payload);
    case "TEAMS":
      return sendTeams(channel.config, payload);
    case "WEBHOOK":
      return sendWebhook(channel.config, payload);
    default:
      return;
  }
}

async function sendEmail(configData: any, payload: NotificationPayload) {
  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });

  const to = configData.to;
  if (!to) return;

  await transporter.sendMail({
    from: configData.from || config.smtp.from,
    to,
    subject: configData.subject || payload.title,
    text: payload.message,
  });
}

async function sendSlack(configData: any, payload: NotificationPayload) {
  if (!configData.webhookUrl) return;
  await fetch(configData.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: `*${payload.title}*\n${payload.message}` }),
  });
}

async function sendDiscord(configData: any, payload: NotificationPayload) {
  if (!configData.webhookUrl) return;
  await fetch(configData.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: `**${payload.title}**\n${payload.message}` }),
  });
}

async function sendTeams(configData: any, payload: NotificationPayload) {
  if (!configData.webhookUrl) return;
  await fetch(configData.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: `${payload.title}\n${payload.message}` }),
  });
}

async function sendWebhook(configData: any, payload: NotificationPayload) {
  if (!configData.url) return;
  await fetch(configData.url, {
    method: configData.method || "POST",
    headers: { "Content-Type": "application/json", ...(configData.headers || {}) },
    body: JSON.stringify({ title: payload.title, message: payload.message }),
  });
}

async function sendTelegram(configData: any, payload: NotificationPayload) {
  if (!configData.botToken || !configData.chatId) return;
  const url = `https://api.telegram.org/bot${configData.botToken}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: configData.chatId, text: `${payload.title}\n${payload.message}` }),
  });
}
