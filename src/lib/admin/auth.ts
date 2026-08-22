import { createHash } from "node:crypto";

export const ADMIN_COOKIE = "admin_session";
const password = process.env.ADMIN_PASSWORD ?? "wedding-admin";

export function hash(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function adminToken(): string {
  return hash(password);
}

export function isValidAdminToken(value?: string | null): boolean {
  return !!value && value === adminToken();
}
