import { Client } from "@upstash/qstash";
import { NextResponse } from "next/server";

const qstash = new Client({
  token: process.env.QSTASH_TOKEN,
  ...(process.env.QSTASH_URL && { baseUrl: process.env.QSTASH_URL }),
});

export async function POST(req) {
  const { ids } = await req.json();
  if (!ids?.length) return NextResponse.json({ ok: true });
  // Best-effort: ids that already fired make this throw, and the service
  // worker's token check is what actually guarantees nothing stale shows.
  try {
    await qstash.messages.cancel(ids);
  } catch {}
  return NextResponse.json({ ok: true });
}
