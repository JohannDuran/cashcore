import { NextResponse } from "next/server";
import { getPublicVapidKey, isWebPushConfigured } from "@/lib/web-push";

export async function GET() {
  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: "Web Push not configured" },
      { status: 503 }
    );
  }

  const publicKey = getPublicVapidKey();

  return NextResponse.json({
    publicKey,
  });
}
