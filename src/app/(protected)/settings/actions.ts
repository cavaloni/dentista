'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ensureCompanyForUser } from "@/lib/practice";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const settingsSchema = z.object({
  name: z.string().min(1).max(120),
  claim_window_minutes: z.coerce.number().int().min(1).max(60),
  recipients_per_wave: z.coerce.number().int().min(1).max(25),
  default_duration_minutes: z.coerce.number().int().min(5).max(180),
  invite_template: z.string().min(10).max(500),
  confirmation_template: z.string().min(10).max(500),
  taken_template: z.string().min(10).max(500),
  demo_mode: z.coerce.boolean().optional(),
});

export type SettingsState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export async function updateSettingsAction(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    claim_window_minutes: formData.get("claim_window_minutes"),
    recipients_per_wave: formData.get("recipients_per_wave"),
    default_duration_minutes: formData.get("default_duration_minutes"),
    invite_template: formData.get("invite_template"),
    confirmation_template: formData.get("confirmation_template"),
    taken_template: formData.get("taken_template"),
    demo_mode: formData.get("demo_mode") === "on",
  });

  if (!parsed.success) {
    return { status: "error", message: "Please review the fields." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const companyId = await ensureCompanyForUser(user.id);
  const service = createSupabaseServiceClient();

  const { error } = await service
    .from("companies")
    .update(parsed.data)
    .eq("id", companyId);

  if (error) {
    console.error("[updateSettingsAction] Database error:", error);
    return { status: "error", message: `Failed to update settings: ${error.message}` };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { status: "success", message: "Settings saved." };
}
