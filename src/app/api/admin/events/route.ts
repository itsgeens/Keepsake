import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EventRow } from "@/types/database";

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "event"
  );
}

export async function GET(req: NextRequest) {
  if (!isValidAdminToken(req.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const supabase = createAdminClient();
    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const { data: photoRows } = await supabase
      .from("photos")
      .select("event_id");
    const counts: Record<string, number> = {};
    for (const r of photoRows ?? []) {
      counts[r.event_id] = (counts[r.event_id] ?? 0) + 1;
    }
    const result = (events ?? []).map((e: EventRow) => ({
      ...e,
      photo_count: counts[e.id] ?? 0,
    }));
    return NextResponse.json({ events: result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isValidAdminToken(req.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const coupleName = String(body.couple_name ?? name).trim() || name;
  const eventDate = String(body.event_date ?? "");
  if (!name || !eventDate) {
    return NextResponse.json(
      { error: "name and event_date are required" },
      { status: 400 },
    );
  }
  const guestPhotoLimit = Number.isFinite(Number(body.guest_photo_limit))
    ? Number(body.guest_photo_limit)
    : 25;
  const status = body.status === "draft" ? "draft" : "active";
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      name,
      couple_name: coupleName,
      event_date: eventDate,
      slug: `${slugify(name)}-${randomUUID().slice(0, 4)}`,
      access_token: randomUUID(),
      status,
      guest_photo_limit: guestPhotoLimit,
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ event: data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 },
    );
  }
}
