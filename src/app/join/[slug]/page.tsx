import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

// Typeable entry point: /join/<slug> -> /camera/<access_token>/join
// The slug is a friendly alias; the UUID token remains the real auth. We
// resolve it server-side (service role) so the slug never needs to map to a
// separate flow, and hand off to the existing token-based join page.
export default async function JoinBySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let token: string | null = null;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("events")
      .select("access_token")
      .eq("slug", slug)
      .maybeSingle();
    token = data?.access_token ?? null;
  } catch {
    token = null;
  }

  if (token) redirect(`/camera/${token}/join`);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6 text-center">
      <h1 className="text-xl font-semibold text-text-primary">
        Event not found
      </h1>
      <p className="mt-2 max-w-xs text-sm text-text-secondary">
        This invite link is invalid or the event is no longer available.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-text-primary px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-80"
      >
        Go home
      </Link>
    </main>
  );
}
