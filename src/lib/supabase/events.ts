import { createClient } from "@/lib/supabase/client";
import type { EventRow } from "@/types/database";

export async function fetchEventByToken(token: string): Promise<EventRow | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .rpc("get_event_by_token", { p_token: token })
      .maybeSingle();
    const event = data as EventRow | null;
    if (error || !event || !event.id) return null;
    return event;
  } catch {
    return null;
  }
}
