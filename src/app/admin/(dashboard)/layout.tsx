import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin/auth";
import AdminNav from "@/components/admin/AdminNav";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!isValidAdminToken(token)) {
    redirect("/admin/login");
  }
  return (
    <div className="min-h-dvh bg-surface">
      <AdminNav />
      <div className="mx-auto max-w-3xl px-6 py-8">{children}</div>
    </div>
  );
}
