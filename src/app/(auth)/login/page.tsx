import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = await searchParams;
  const errorMessage = resolvedSearchParams.error === "auth_callback_error"
    ? "Authentication failed. Please try again."
    : null;

  return (
    <div className="space-y-6">
      <LoginForm />
      {errorMessage && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {errorMessage}
        </div>
      )}
      <p className="text-xs text-center text-slate-500">
        Need help? Email <Link className="underline" href="mailto:support@whatscal.app">support@whatscal.app</Link>
      </p>
    </div>
  );
}
