import { Client } from "@upstash/qstash";
import { NextResponse } from "next/server";

const qstash = new Client({
  token: process.env.QSTASH_TOKEN,
  ...(process.env.QSTASH_URL && { baseUrl: process.env.QSTASH_URL }),
});

export async function POST(req) {
  const { ids } = await req.json();
  if (!ids?.length) return NextResponse.json({ ok: true });
  await Promise.allSettled(ids.map((id) => qstash.messages.delete(id)));
  return NextResponse.json({ ok: true });
}
