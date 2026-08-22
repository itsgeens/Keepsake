export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type EventStatus = "draft" | "active" | "closed" | "archived";

export type FilmPreset = {
  grain: number;
  warmth: number;
  contrast: number;
  brightness: number;
  vignette: number;
};

export type EventRow = {
  id: string;
  name: string;
  couple_name: string;
  event_date: string;
  slug: string;
  access_token: string;
  status: EventStatus;
  film_preset: FilmPreset;
  guest_photo_limit: number;
  created_at: string;
}

export type GuestRow = {
  id: string;
  event_id: string;
  first_name: string;
  last_name: string | null;
  session_id: string;
  created_at: string;
  last_active_at: string;
}

export type PhotoRow = {
  id: string;
  event_id: string;
  guest_id: string | null;
  guest_name: string;
  original_path: string | null;
  processed_path: string;
  status: string;
  captured_at: string;
  uploaded_at: string;
  is_hidden: boolean;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      events: {
        Row: EventRow;
        Insert: {
          id?: string;
          name: string;
          couple_name: string;
          event_date: string;
          slug: string;
          access_token: string;
          status?: EventStatus;
          film_preset?: FilmPreset;
          guest_photo_limit?: number;
          created_at?: string;
        };
        Update: Partial<EventRow>;
        Relationships: [];
      };
      guests: {
        Row: GuestRow;
        Insert: {
          id?: string;
          event_id: string;
          first_name: string;
          last_name?: string | null;
          session_id: string;
          created_at?: string;
          last_active_at?: string;
        };
        Update: Partial<GuestRow>;
        Relationships: [];
      };
      photos: {
        Row: PhotoRow;
        Insert: {
          id?: string;
          event_id: string;
          guest_id?: string | null;
          guest_name: string;
          original_path?: string | null;
          processed_path: string;
          status?: string;
          captured_at?: string;
          uploaded_at?: string;
          is_hidden?: boolean;
          created_at?: string;
        };
        Update: Partial<PhotoRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_event_by_token: {
        Args: { p_token: string };
        Returns: EventRow;
      };
      is_event_active: {
        Args: { event_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      event_status: EventStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
