import { NextResponse } from "next/server";

import { retryFailedMessages } from "@/lib/messaging";
import { env } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

function authorize(request: Request) {
  if (!env.CRON_SECRET) {
    return true;
  }

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.CRON_SECRET}`;
  return header === expected;
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createSupabaseServiceClient();

  // @ts-expect-error - RPC function types need regeneration
  const { data: expiredSlots, error } = await supabase.rpc("expire_open_slots");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (expiredSlots && Array.isArray(expiredSlots) && expiredSlots.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slotIds = expiredSlots.map((slot: any) => slot.id);
    await supabase
      .from("claims")
      .update({ status: "expired" })
      .in("slot_id", slotIds)
      .eq("status", "pending");
  }

  const retryResults = await retryFailedMessages(25);

  return NextResponse.json({
    expired: expiredSlots?.length ?? 0,
    retried: retryResults.length,
  });
}

export const dynamic = "force-dynamic";
