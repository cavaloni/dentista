'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ensurePracticeForUser } from "@/lib/practice";
import { normalizeAddress } from "@/lib/messaging/providers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const memberSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().min(1).max(120),
  channel: z.enum(["whatsapp", "sms", "email"]),
  address: z.string().min(3).max(160),
  priority: z.coerce.number().int(),
  notes: z.string().max(500).optional().nullable(),
});

export type WaitlistActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const initialState: WaitlistActionState = { status: "idle" };

function initial() {
  return initialState;
}

async function getContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const practiceId = await ensurePracticeForUser(session.user.id);
  const service = createSupabaseServiceClient();

  return { supabase, service, practiceId } as const;
}

export async function createMemberAction(
  _prev: WaitlistActionState,
  formData: FormData
): Promise<WaitlistActionState> {
  const parsed = memberSchema.safeParse({
    full_name: formData.get("full_name"),
    channel: formData.get("channel"),
    address: formData.get("address"),
    priority: formData.get("priority"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Please check the form fields." };
  }

  const { service, practiceId } = await getContext();

  const normalizedAddress = normalizeAddress(
    parsed.data.channel,
    parsed.data.address
  );

  const { error } = await service.from("waitlist_members").insert({
    practice_id: practiceId,
    full_name: parsed.data.full_name,
    channel: parsed.data.channel,
    address: normalizedAddress,
    priority: parsed.data.priority,
    notes: parsed.data.notes ?? null,
  });

  if (error) {
    return {
      status: "error",
      message: "Unable to add member right now.",
    };
  }

  revalidatePath("/waitlist");
  return { status: "success", message: "Member added." };
}

export async function updateMemberAction(
  _prev: WaitlistActionState,
  formData: FormData
): Promise<WaitlistActionState> {
  const parsed = memberSchema.safeParse({
    id: formData.get("id"),
    full_name: formData.get("full_name"),
    channel: formData.get("channel"),
    address: formData.get("address"),
    priority: formData.get("priority"),
    notes: formData.get("notes"),
  });

  if (!parsed.success || !parsed.data.id) {
    return { status: "error", message: "Invalid member payload." };
  }

  const { service, practiceId } = await getContext();

  const normalizedAddress = normalizeAddress(
    parsed.data.channel,
    parsed.data.address
  );

  const { error } = await service
    .from("waitlist_members")
    .update({
      full_name: parsed.data.full_name,
      channel: parsed.data.channel,
      address: normalizedAddress,
      priority: parsed.data.priority,
      notes: parsed.data.notes ?? null,
    })
    .eq("id", parsed.data.id)
    .eq("practice_id", practiceId);

  if (error) {
    return {
      status: "error",
      message: "Update failed.",
    };
  }

  revalidatePath("/waitlist");
  return { status: "success", message: "Member updated." };
}

export async function toggleMemberAction(formData: FormData) {
  const { service, practiceId } = await getContext();
  const id = formData.get("id");
  const active = formData.get("active");

  if (!id || typeof id !== "string") {
    return;
  }

  await service
    .from("waitlist_members")
    .update({ active: active === "true" })
    .eq("id", id)
    .eq("practice_id", practiceId);

  revalidatePath("/waitlist");
}

export async function deleteMemberAction(formData: FormData) {
  const { service, practiceId } = await getContext();
  const id = formData.get("id");

  if (!id || typeof id !== "string") {
    return;
  }

  await service
    .from("waitlist_members")
    .delete()
    .eq("id", id)
    .eq("practice_id", practiceId);

  revalidatePath("/waitlist");
}

export { initial as initialWaitlistState };
