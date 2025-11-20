'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ensurePracticeForUser } from "@/lib/practice";
import { normalizeAddress } from "@/lib/messaging/providers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { type WaitlistActionState, type WaitlistMember } from "./shared";

const memberSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().min(1).max(120),
  channel: z.enum(["whatsapp", "sms", "email"]),
  address: z.string().min(3).max(160),
  priority: z.coerce.number().int(),
  notes: z.string().max(500).optional().nullable(),
});

async function getContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const companyId = await ensurePracticeForUser(user.id);
  const service = createSupabaseServiceClient();

  return { supabase, service, companyId } as const;
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

  const { service, companyId } = await getContext();

  const normalizedAddress = normalizeAddress(
    parsed.data.channel,
    parsed.data.address
  );

  const { data, error } = await service
    .from("waitlist_members")
    .insert({
      company_id: companyId,
      full_name: parsed.data.full_name,
      channel: parsed.data.channel,
      address: normalizedAddress,
      priority: parsed.data.priority,
      notes: parsed.data.notes ?? null,
    })
    .select(
      "id, full_name, channel, address, priority, active, notes, last_notified_at"
    )
    .single();

  if (error || !data) {
    console.error("[createMemberAction] Database error:", error);
    return {
      status: "error",
      message: `Unable to add member: ${error?.message ?? "Unknown error"}`,
    };
  }

  revalidatePath("/waitlist");
  return {
    status: "success",
    message: "Member added.",
    member: data as WaitlistMember,
  };
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

  const { service, companyId } = await getContext();

  const normalizedAddress = normalizeAddress(
    parsed.data.channel,
    parsed.data.address
  );

  const { data, error } = await service
    .from("waitlist_members")
    .update({
      full_name: parsed.data.full_name,
      channel: parsed.data.channel,
      address: normalizedAddress,
      priority: parsed.data.priority,
      notes: parsed.data.notes ?? null,
    })
    .eq("id", parsed.data.id)
    .eq("company_id", companyId)
    .select(
      "id, full_name, channel, address, priority, active, notes, last_notified_at"
    )
    .single();

  if (error || !data) {
    console.error("[updateMemberAction] Database error:", error);
    return {
      status: "error",
      message: `Update failed: ${error?.message ?? "Unknown error"}`,
    };
  }

  revalidatePath("/waitlist");
  return {
    status: "success",
    message: "Member updated.",
    member: data as WaitlistMember,
  };
}

export async function toggleMemberAction(formData: FormData) {
  const { service, companyId } = await getContext();
  const id = formData.get("id");
  const active = formData.get("active");

  if (!id || typeof id !== "string") {
    return null;
  }

  const { data, error } = await service
    .from("waitlist_members")
    .update({ active: active === "true" })
    .eq("id", id)
    .eq("company_id", companyId)
    .select(
      "id, full_name, channel, address, priority, active, notes, last_notified_at"
    )
    .single();

  if (error || !data) {
    console.error("[toggleMemberAction] Database error:", error);
    return null;
  }

  revalidatePath("/waitlist");
  return data as WaitlistMember;
}

export async function deleteMemberAction(formData: FormData) {
  const { service, companyId } = await getContext();
  const id = formData.get("id");

  if (!id || typeof id !== "string") {
    return { success: false };
  }

  const { error } = await service
    .from("waitlist_members")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    console.error("[deleteMemberAction] Database error:", error);
    return { success: false };
  }

  revalidatePath("/waitlist");
  return { success: true, id };
}

export async function getAllMembersAction(): Promise<WaitlistMember[]> {
  const { supabase, companyId } = await getContext();

  const { data: members } = await supabase
    .from("waitlist_members")
    .select(
      "id, full_name, channel, address, priority, active, notes, last_notified_at"
    )
    .eq("company_id", companyId)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  return (members as WaitlistMember[]) || [];
}

export async function bulkImportMembersAction(
  members: Array<{
    full_name: string;
    channel: "whatsapp" | "sms" | "email";
    address: string;
    priority: number;
    notes: string;
  }>
): Promise<{ success: boolean; imported: number; errors: number; message: string }> {
  try {
    const { service, companyId } = await getContext();

    // Validate all members
    const validMembers = [];
    let errorCount = 0;

    for (const member of members) {
      const parsed = memberSchema.safeParse(member);
      if (parsed.success) {
        const normalizedAddress = normalizeAddress(
          parsed.data.channel,
          parsed.data.address
        );
        validMembers.push({
          company_id: companyId,
          full_name: parsed.data.full_name,
          channel: parsed.data.channel,
          address: normalizedAddress,
          priority: parsed.data.priority,
          notes: parsed.data.notes || null,
          active: false, // Import as inactive by default
        });
      } else {
        errorCount++;
      }
    }

    if (validMembers.length === 0) {
      return {
        success: false,
        imported: 0,
        errors: errorCount,
        message: "No valid members to import",
      };
    }

    // Bulk insert
    const { data, error } = await service
      .from("waitlist_members")
      .insert(validMembers)
      .select("id");

    if (error) {
      console.error("[bulkImportMembersAction] Database error:", error);
      return {
        success: false,
        imported: 0,
        errors: members.length,
        message: `Import failed: ${error.message}`,
      };
    }

    revalidatePath("/waitlist");
    
    return {
      success: true,
      imported: data?.length || 0,
      errors: errorCount,
      message: `Successfully imported ${data?.length || 0} contacts${errorCount > 0 ? `, ${errorCount} skipped due to errors` : ""}`,
    };
  } catch (error) {
    console.error("[bulkImportMembersAction] Unexpected error:", error);
    return {
      success: false,
      imported: 0,
      errors: members.length,
      message: "An unexpected error occurred during import",
    };
  }
}

export async function bulkDeleteMembersAction(memberIds: string[]) {
  const { service, companyId } = await getContext();

  const { error } = await service
    .from("waitlist_members")
    .delete()
    .in("id", memberIds)
    .eq("company_id", companyId);

  if (error) {
    console.error("[bulkDeleteMembersAction] Database error:", error);
    return { success: false, message: "Failed to delete members" };
  }

  revalidatePath("/waitlist");
  return { success: true, deleted: memberIds.length };
}

export async function bulkToggleMembersAction(memberIds: string[], active: boolean) {
  const { service, companyId } = await getContext();

  const { error } = await service
    .from("waitlist_members")
    .update({ active })
    .in("id", memberIds)
    .eq("company_id", companyId);

  if (error) {
    console.error("[bulkToggleMembersAction] Database error:", error);
    return { success: false, message: `Failed to ${active ? 'activate' : 'deactivate'} members` };
  }

  revalidatePath("/waitlist");
  return { success: true, updated: memberIds.length, active };
}
