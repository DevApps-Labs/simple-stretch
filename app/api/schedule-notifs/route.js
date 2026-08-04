import { Client } from "@upstash/qstash";
import { NextResponse } from "next/server";

function makeQstash() {
  return new Client({
    token: process.env.QSTASH_TOKEN,
    ...(process.env.QSTASH_URL && { baseUrl: process.env.QSTASH_URL }),
  });
}

function getNotifUrl() {
  const base =
    process.env.APP_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  return `${base}/api/send-notif`;
}

export async function POST(req) {
  const notifUrl = getNotifUrl();

  const { subscription, schedule, token } = await req.json();
  if (!schedule?.length) return NextResponse.json({ ids: [] });

  const qstash = makeQstash();

  // Schedule items carry offsets relative to the client's own clock rather
  // than absolute timestamps: phone clocks drift from server clocks, and a
  // handful of seconds of skew is glaring on a 20-second stretch phase.
  //
  // Published as one batch, not a publish-per-item loop: a long routine meant
  // dozens of sequential round trips, and every second of that was a window in
  // which a suspended client could lose the ids it needs to cancel.
  const messages = schedule.map((item) => ({
    url: notifUrl,
    delay: Math.max(0, Math.round(item.afterMs / 1000)),
    body: { subscription, title: item.title, body: item.body, token },
  }));

  // QStash caps a single batch, so send long routines as a few concurrent
  // batches rather than falling back to one request per message.
  const BATCH_SIZE = 100;
  const batches = [];
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    batches.push(messages.slice(i, i + BATCH_SIZE));
  }

  const results = await Promise.all(batches.map((b) => qstash.batchJSON(b)));
  const ids = results
    .flat(2)
    .map((r) => r?.messageId)
    .filter(Boolean);

  return NextResponse.json({ ids });
}
