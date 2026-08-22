"use client";

import { useRouter } from "next/navigation";

export default function AdminNav() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="border-b border-separator bg-surface">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <span className="text-sm font-semibold text-text-primary">
          The Wedding Camera · Admin
        </span>
        <button
          type="button"
          onClick={logout}
          className="text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
