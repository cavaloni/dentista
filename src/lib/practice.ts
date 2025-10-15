import { cache } from "react";

import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const ensurePracticeForUser = cache(async (userId: string) => {
  const supabase = createSupabaseServiceClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("practice_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (profile?.practice_id) {
    return profile.practice_id;
  }

  const { data: practice, error: practiceError } = await supabase
    .from("practices")
    .insert({ name: "Dental Practice" })
    .select("id")
    .single();

  if (practiceError) {
    throw practiceError;
  }

  const { error: insertProfileError } = await supabase
    .from("profiles")
    .insert({ user_id: userId, practice_id: practice.id });

  if (insertProfileError) {
    throw insertProfileError;
  }

  return practice.id as string;
});
