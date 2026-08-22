import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EventRow } from "@/types/database";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isValidAdminToken(req.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { count } = await supabase
    .from("photos")
    .select("*", { count: "exact", head: true })
    .eq("event_id", id);
  return NextResponse.json({ event: { ...event, photo_count: count ?? 0 } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isValidAdminToken(req.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const updates: Partial<EventRow> = {};
  if (body.guest_photo_limit !== undefined) {
    const n = Number(body.guest_photo_limit);
    if (!Number.isFinite(n) || n < 1) {
      return NextResponse.json(
        { error: "guest_photo_limit must be a positive number" },
        { status: 400 },
      );
    }
    updates.guest_photo_limit = Math.floor(n);
  }
  if (body.status !== undefined) {
    const s = String(body.status);
    if (!["draft", "active", "closed", "archived"].includes(s)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = s as EventRow["status"];
  }
  if (body.couple_name !== undefined) {
    updates.couple_name = String(body.couple_name).trim();
  }
  if (body.name !== undefined) updates.name = String(body.name).trim();
  if (body.event_date !== undefined) {
    updates.event_date = String(body.event_date);
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("events")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ event: data });
}
