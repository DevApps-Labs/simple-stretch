import { Client } from "@upstash/qstash";
import { NextResponse } from "next/server";

const qstash = new Client({
  token: process.env.QSTASH_TOKEN,
  ...(process.env.QSTASH_URL && { baseUrl: process.env.QSTASH_URL }),
});

const baseUrl = process.env.APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
const notifUrl = `${baseUrl}/api/send-notif`;

export async function POST(req) {
  const { subscription, schedule } = await req.json();

  const ids = [];
  for (const item of schedule) {
    const delaySec = Math.round(Math.max(0, item.at - Date.now()) / 1000);
    const msg = await qstash.publishJSON({
      url: notifUrl,
      delay: delaySec,
      body: { subscription, title: item.title, body: item.body },
    });
    ids.push(msg.messageId);
  }

  return NextResponse.json({ ids });
}
