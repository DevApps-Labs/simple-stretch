import webpush from "web-push";
import { Receiver } from "@upstash/qstash";
import { NextResponse } from "next/server";

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
});

export async function POST(req) {
  const rawBody = await req.text();
  const sig = req.headers.get("upstash-signature") ?? "";

  try {
    await receiver.verify({ signature: sig, body: rawBody });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { subscription, title, body } = JSON.parse(rawBody);

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title, body })
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    // 410 Gone = subscription expired/unsubscribed, not a real error
    const status = err.statusCode === 410 ? 200 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
