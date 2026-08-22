# OpenCode Build Guide: The Wedding Camera Web App

This guide contains the exact prompts and code specifications to feed into **OpenCode** (using **DeepSeek V4 Flash**) phase by phase.

---

## 📌 Phase 1: Next.js Setup & Design Foundation

```markdown
Initialize a Next.js 14/15 TypeScript application in the current directory with Tailwind CSS and App Router.

1. Dependencies to install:
npm install @supabase/supabase-js @supabase/ssr lucide-react idb qrcode.react jszip file-saver clsx tailwind-merge
npm install -D @types/file-saver @types/qrcode

2. Update `tailwind.config.ts` to include our design tokens:
theme: {
  extend: {
    colors: {
      paper: '#FAF7F2',
      'paper-card': '#FFFDF9',
      'paper-border': '#E8E2D8',
      charcoal: '#262422',
      'charcoal-muted': '#6E6A63',
      wine: '#8C2D27',
      'wine-light': '#FAF0EF',
      gold: '#D4AF37',
      'stamp-yellow': '#E29D12',
    },
    fontFamily: {
      serif: ['Newsreader', 'Georgia', 'serif'],
      sans: ['Plus Jakarta Sans', 'sans-serif'],
      mono: ['Courier Prime', 'monospace'],
    }
  }
}

3. In `src/app/globals.css`:
- Import Google Fonts: Newsreader, Plus Jakarta Sans, Courier Prime
- Setup base body background: #ECE7DF with text #262422
- Define .paper-texture with radial-gradient dot pattern
- Define .date-stamp (font Courier Prime, color #E29D12, text-shadow glow)
- Define .polaroid-frame styling and subtle hover tilt

4. Create `src/lib/supabase/client.ts` (createBrowserClient) and `src/lib/supabase/server.ts` (createServerClient) using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
```

---

## 📌 Phase 2: Database Schema & Supabase Setup

```markdown
Create the database schema file `supabase/schema.sql` for our Wedding Camera App:

1. Tables:
- `events`:
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  couple_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  access_token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed', 'archived')),
  film_preset JSONB DEFAULT '{"grain": 0.06, "warmth": 0.12, "contrast": 1.06, "brightness": 0.98, "vignette": 0.3}',
  guest_photo_limit INT DEFAULT 25,
  created_at TIMESTAMPTZ DEFAULT now()

- `guests`:
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now()

- `photos`:
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  original_path TEXT,
  processed_path TEXT NOT NULL,
  status TEXT DEFAULT 'uploaded',
  captured_at TIMESTAMPTZ DEFAULT now(),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()

2. Enable Row Level Security (RLS) on all tables with public policies allowing guest inserts/reads for active events, and create storage bucket configuration notes for `wedding-photos`.
3. Create TypeScript interfaces in `src/types/database.ts`.
```

---

## 📌 Phase 3: Guest Onboarding & Session Hook

```markdown
Create the guest onboarding routes and session management:

1. `src/hooks/useGuestSession.ts`:
- A React hook managing guest state in localStorage (`wedding_guest_session_${eventToken}`)
- State: `{ guestId, firstName, lastName, fullName, sessionId, shotsLeft }`
- Method: `saveSession(firstName, lastName, guestId)`
- Method: `decrementShots()`

2. `src/app/camera/[token]/page.tsx` (Welcome Screen):
- Displays couple name ("GINO + GABBY"), event date ("10.01.26"), subtitle "THE WEDDING CAMERA"
- Card with retro camera icon: "Take a picture. Keep the memory."
- "JOIN THE CAMERA" CTA button routing to `/camera/[token]/join`
- If guest session already exists, auto-redirect to `/camera/[token]/shoot`

3. `src/app/camera/[token]/join/page.tsx` (Name Entry Screen):
- Step 1 of 2 header
- Inputs for "FIRST NAME" and "LAST NAME"
- Submit button "START SHOOTING"
- On submit: saves guest record to Supabase `guests` table, updates localStorage, and redirects to `/camera/[token]/shoot`.
```

---

## 📌 Phase 4: Camera Viewfinder & Web Audio

```markdown
Build the retro disposable camera capture interface in `src/app/camera/[token]/shoot/page.tsx` and `src/components/camera/Viewfinder.tsx`:

1. Viewfinder Screen layout matching mockup:
- Top bar with couple names, date, and live badge "18 SHOTS LEFT"
- 4:3 Viewfinder frame with white corner tick marks, center focus circle, "ISO 400 FILM", and "EXP. 07/25" counter
- Live video stream using `navigator.mediaDevices.getUserMedia` (defaulting to rear camera: `facingMode: 'environment'`)
- Fallback hidden `<input type="file" accept="image/*" capture="environment">` if camera access is denied

2. Camera Controls:
- Front / Rear camera flip button
- Flash simulation toggle (Auto / Off) with screen flash white overlay animation
- Tactile metallic circular shutter button with wine-colored center

3. Web Audio Shutter Sound Synthesizer:
- Implement a realistic mechanical shutter click sound using Web Audio API (`AudioContext` + bandpass filter noise burst) so no external mp3 assets are required.

4. On Shutter Press:
- Play shutter sound, trigger flash effect, decrement shots counter, capture current video frame to an offscreen canvas, and open the Developing Modal.
```

---

## 📌 Phase 5: Canvas Film Processing & Developing Experience

```markdown
Create the client-side film processing engine and developing animation:

1. `src/lib/photo/filmProcessor.ts`:
- Function `processFilmPhoto(imageSource: CanvasImageSource | Blob, options)`:
  - Draws image to an HTML5 Canvas scaled to max dimension (e.g. 2048px)
  - Color treatment: warm sepia tint (sepia + contrast + saturation boost + slight warm curve)
  - Film grain: creates procedural fractal noise / pixel grain overlay with 5% opacity
  - Vignette: radial gradient dark shading at the borders
  - Date Stamp: draws retro digital date stamp in orange/yellow monospace font (`#E29D12`) in the bottom-right corner (e.g. "10.01.26")
  - Returns processed Blob (image/jpeg, 0.85 quality) and data URL

2. `src/components/camera/DevelopingModal.tsx`:
- Polaroid card frame with tilt (`-1deg`)
- 2.8s emulsion developing animation (blur and dark sepia gradually clearing to vibrant retro photo)
- Status text: "DEVELOPING FILM PROCESS..."
- Metadata: "BY [GUEST NAME]", current time, "ORIGINAL FILM" badge
- Action buttons revealed after developing completes:
  - "KEEP IT & ADD TO ROLL" (enqueues upload and navigates to roll)
  - "RETAKE PHOTO" (refunds shot and returns to camera)
```

---

## 📌 Phase 6: Offline-First Upload Queue (IndexedDB)

```markdown
Build the offline-resilient upload queue using IndexedDB:

1. `src/lib/storage/uploadQueue.ts`:
- Use `idb` to manage an object store `photo_queue`
- Record schema: `{ id, eventId, token, guestId, guestName, processedBlob, originalBlob, capturedAt, status: 'pending'|'uploading'|'failed'|'completed' }`
- Functions: `enqueuePhoto()`, `getPendingPhotos()`, `markPhotoStatus()`, `removePhoto()`

2. `src/hooks/useUploadSync.ts`:
- Background upload coordinator
- Listens to `window.addEventListener('online')` and periodic timer
- Takes pending items from IndexedDB → uploads processed JPEG to Supabase Storage `wedding-photos/{eventId}/processed/{photoId}.jpg` → inserts row in `photos` table → marks complete in IndexedDB
- Exposes pending count for UI badge (e.g. "2 photos syncing...")
```

---

## 📌 Phase 7: Shared Wedding Roll (Gallery & Realtime)

```markdown
Build the shared gallery in `src/app/camera/[token]/roll/page.tsx`:

1. Header & Filter Bar:
- Couple names, date, "OUR WEDDING ROLL", photo count badge
- Filter tabs: `ALL` vs `MINE`
- Floating button: "TAKE A PHOTO" to return to camera

2. Gallery Grid:
- Masonry / staggered 2-column grid of polaroid cards
- Alternating gentle rotations (`rotate-[-1deg]` / `rotate-[1deg]`)
- Polaroid footer showing guest name and formatted time ("8:47 PM")
- Real-time updates: subscribe to Supabase Realtime `postgres_changes` on `photos` table to automatically prepend newly taken photos.

3. `src/components/gallery/PhotoDetailModal.tsx`:
- Full-screen modal with large polaroid frame
- Guest attribution and timestamp
- "SAVE PHOTO" button (triggers direct image download)
- "BACK TO ROLL" button
```

---

## 📌 Phase 8: Admin Dashboard, QR Studio & Bulk Export

```markdown
Build the Couple / Admin Dashboard in `src/app/admin/events/[eventId]/page.tsx`:

1. Metrics & Overview:
- Stat cards: Guest count, Photos count, Live event status indicator

2. Printable QR Studio:
- Render high-resolution event QR code pointing to `/camera/{token}`
- "DOWNLOAD QR" (PNG download via canvas/SVG)
- "COPY LINK" button with toast notification

3. Moderation Grid:
- View all event photos with tabs: `ALL`, `BY GUEST`, `HIDDEN`
- Actions per photo: Hide from public roll, Delete, Download

4. Bulk High-Res ZIP Export (`src/lib/export/zipExporter.ts`):
- "DOWNLOAD ALL PHOTOS (HIGH-RES)" button
- Fetches all photos for the event from Supabase Storage
- Bundles them into a structured ZIP file (`processed/` and `originals/`) using `jszip` and `file-saver`.
```
