# Wedding Camera Web App — Product & Technical Specification

## 1. Product Overview

A mobile-first web app that turns a wedding into a shared digital disposable camera.

Guests scan a QR code, join the wedding event, enter their name, and immediately get access to a camera. Photos are processed into a consistent retro film aesthetic and uploaded to a shared wedding photo roll.

The core experience is:

**Scan QR → Join event → Enter name → Take photos → Film processing → Upload → Shared wedding roll**

The app should feel simple, warm, playful, nostalgic, and easy to use. It should not feel like a generic SaaS product, wedding-planning platform, or futuristic AI application.

### Product principles

1. No app download.
2. No guest account/password.
3. QR-first onboarding.
4. Camera-first guest experience.
5. Minimal UI.
6. Photos should feel like they came from one shared disposable/film camera.
7. Uploads should be resilient to poor venue connectivity.
8. The couple owns and can export all wedding photos.

---

# 2. Primary Users

## Couple / Event Admin

The couple creates and manages the wedding event, generates the QR code, views the photo roll, manages guests/photos, and exports the final collection.

## Guest

A wedding guest scans the QR code, enters their name, takes photos, and contributes them to the shared wedding roll.

---

# 3. MVP Feature Set

## 3.1 Event Creation

Admin can create a wedding event containing:

- Couple names
- Event name
- Event date
- Event slug
- Unique event access token
- Event status
- Selected photo style/preset
- Optional guest photo limit

Example:

```text
GINO + GABBY
THE WEDDING CAMERA
October 1, 2026
```

Event statuses:

- Draft
- Active
- Closed
- Archived

Only an Active event accepts new guest sessions and photo uploads.

---

# 4. QR Code

Every event has a unique QR code.

The QR code should point to a public event URL such as:

`/camera/{event-token}`

Example:

`https://app-domain.com/camera/8H72K9`

Admin capabilities:

- Generate QR code
- Preview QR code
- Download QR code as PNG
- Download QR code as SVG if practical
- Copy event URL
- Disable event access

The QR code should not expose internal database IDs.

Use a random, non-guessable event token.

---

# 5. Guest Onboarding

Guest flow:

```text
Scan QR
  ↓
Wedding welcome screen
  ↓
Join the camera
  ↓
Enter first name + last name
  ↓
Start shooting
  ↓
Camera
```

No email, password, or account creation should be required.

The app should create an anonymous guest session associated with:

- Event
- Guest name
- Session/device identifier
- Created timestamp
- Last active timestamp

The guest's identity should persist on their device so they do not have to repeatedly enter their name.

---

# 6. Camera Experience

The camera is the most important guest-facing feature.

The UI should feel like a digital disposable camera rather than a standard smartphone camera.

Display:

- Camera preview
- Shutter button
- Front/back camera toggle
- Remaining shots
- Event name
- Date
- Optional film/camera label

Example:

```text
GINO + GABBY
10.01.26

[ CAMERA PREVIEW ]

        ○
    TAP TO SHOOT

18 SHOTS LEFT
```

The app should use the browser's camera APIs through the device's supported browser.

Do not require a native iOS/Android app for the MVP.

---

# 7. Guest Photo Limits

Optional configurable feature.

The couple can specify a number of shots per guest, e.g.:

- 10
- 20
- 27
- 36
- Unlimited

27 or 36 shots are particularly appropriate because they mimic real disposable/35mm film rolls.

The guest should see:

`18 SHOTS LEFT`

after taking 9 of 27 shots.

The limit should be enforced server-side as well as visually in the client.

---

# 8. Photo Processing

Photos should receive a consistent film treatment before being added to the wedding roll.

## MVP approach

Perform the initial image processing client-side in the browser using HTML Canvas / Canvas 2D APIs.

Canvas is not an external API. It is a browser technology that allows JavaScript to draw and manipulate images/pixels.

Processing pipeline:

```text
Camera capture
    ↓
Image / Blob
    ↓
Canvas
    ↓
Resize/compress
    ↓
Film adjustments
    ↓
Film grain
    ↓
Vignette
    ↓
Date stamp / frame
    ↓
JPEG/WebP output
    ↓
Upload to Supabase Storage
```

The original photo may optionally also be retained.

---

# 9. Film Presets

The application should use a reusable preset system rather than hard-coding one filter.

Example preset:

```text
FilmPreset
- name
- brightness
- contrast
- saturation
- warmth
- grain
- vignette
- date_stamp_enabled
- border_enabled
- border_type
```

Initial presets:

### Disposable

- Warm
- Moderate contrast
- Slightly muted saturation
- Visible but tasteful grain
- Mild vignette
- Optional digital date stamp

### 35mm

- More subtle grain
- Slightly muted colors
- Mild warmth
- Minimal vignette
- No border

### Polaroid

- Slightly faded color
- Subtle grain
- White/cream frame
- Optional date or caption

Do not attempt to replicate a specific commercial film stock exactly. Create an original aesthetic inspired by disposable/analog photography.

The initial wedding can use one default preset to maintain visual consistency.

---

# 10. Original vs Processed Images

Prefer storing both when practical.

```text
originals/
processed/
```

Reasons:

- Preserve original photo
- Allow future re-processing
- Allow different filters later
- Allow creation of clean/no-date exports
- Protect against bugs in the processing pipeline

For an MVP with cost constraints, retaining only the processed image can be considered, but the database/storage architecture should allow both.

---

# 11. Photo Developing Experience

After taking a photo:

```text
Shutter
  ↓
Short developing animation
  ↓
Processed photo appears
  ↓
KEEP IT / RETAKE
```

The experience should feel playful and analog.

Possible states:

- `CAPTURING`
- `DEVELOPING`
- `READY`
- `UPLOADING`
- `UPLOADED`
- `QUEUED`
- `FAILED`

Do not make the developing animation unnecessarily long.

---

# 12. Upload Architecture

Supabase Storage should be the primary image storage system.

Recommended structure:

```text
wedding-photos/
  {event-id}/
    originals/
      {photo-id}.jpg

    processed/
      {photo-id}.jpg
```

Use Supabase Storage policies to prevent guests from accessing unrelated events.

Guest uploads should be associated with the guest session and event.

The browser should preferably upload directly to Supabase Storage using a controlled upload flow rather than sending large images through the application server.

---

# 13. Offline / Poor Connectivity Handling

This is a high-priority requirement because a wedding venue may have poor Wi-Fi or cellular service.

The app should not lose a photo simply because an upload failed.

Minimum MVP behavior:

```text
Take photo
  ↓
Process photo
  ↓
Save locally
  ↓
Attempt upload
  ↓
SUCCESS → mark uploaded
  ↓
FAILURE → keep locally queued
  ↓
Connection returns
  ↓
Retry upload
```

Use browser-supported local persistence such as IndexedDB for the upload queue.

Do not rely on an in-memory JavaScript array because it will be lost if the browser is closed/reloaded.

The app should display a small status such as:

`3 photos waiting to upload`

When the connection returns, retry automatically.

---

# 14. Shared Wedding Roll

All processed photos belonging to the event appear in a shared gallery.

Gallery requirements:

- Mobile-first
- Responsive desktop layout
- Masonry or editorial grid
- Photos can appear in different orientations
- Film aesthetic remains consistent
- Near-real-time appearance of new uploads where practical
- Show guest name
- Show timestamp
- Tap photo to view larger version
- Download individual photo

Example:

```text
GINO + GABBY

OUR WEDDING ROLL

"Moments captured by everyone who was there."

[PHOTO] [PHOTO]
[PHOTO] [PHOTO] [PHOTO]
[PHOTO] [PHOTO]
```

---

# 15. Individual Photo View

When a guest taps a photo:

Display:

- Large processed photo
- Guest name
- Date/time
- Download button
- Back to roll

Example:

```text
Captured by Gino
10.01.26 · 8:47 PM

[ SAVE PHOTO ]
[ BACK TO ROLL ]
```

---

# 16. Admin Dashboard

The admin interface should be functional but retain the same visual design language as the guest experience.

Dashboard metrics:

- Guest count
- Photo count
- Upload count
- Pending uploads if tracked
- Storage usage if available
- Event status

Example:

```text
GINO + GABBY
WEDDING CAMERA

287 GUESTS
1,463 PHOTOS
LIVE
```

---

# 17. Admin QR Management

Admin should be able to:

- View QR
- Download QR
- Copy camera link
- Regenerate/rotate event access token if necessary
- Activate/deactivate event

Do not automatically regenerate the QR unless explicitly requested, because printed QR codes must remain valid.

---

# 18. Admin Photo Management

Admin should be able to:

- View all photos
- Filter by guest
- Filter by date/time
- Hide photo
- Delete photo
- Download individual photo
- Download all photos
- Mark/favorite photos if implemented
- View photo metadata

Hidden photos should not appear in the public/shared gallery but should remain available to the admin unless permanently deleted.

---

# 19. Bulk Export

Post-event admin feature:

`DOWNLOAD ALL PHOTOS`

The export should eventually produce a ZIP containing:

```text
Gino-Gabby-Wedding/
  processed/
    photo-001.jpg
    photo-002.jpg
    ...

  originals/
    photo-001.jpg
    photo-002.jpg
    ...
```

Optional future feature:

`EXPORT TO GOOGLE DRIVE`

Google Drive should be treated as an optional archive/export destination, not the primary storage layer.

---

# 20. Recommended Architecture

Keep the MVP architecture simple.

```text
                    QR CODE
                       │
                       ▼
                 NEXT.JS WEB APP
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
    Guest Experience          Admin Experience
          │                         │
          └────────────┬────────────┘
                       ▼
                  SUPABASE
             ┌─────────┼─────────┐
             │         │         │
             ▼         ▼         ▼
         Postgres   Storage   Auth/Session
             │         │
             │         │
             └────┬────┘
                  │
                  ▼
             Shared Gallery
```

### Recommended stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js + React + TypeScript | Web application |
| Hosting | Vercel | Deploy web app |
| Database | Supabase Postgres | Events, guests, photos, settings |
| File storage | Supabase Storage | Original and processed images |
| Guest identity | Anonymous/session-based auth | Avoid guest account creation |
| Image processing | Browser Canvas 2D | Film effect, frame, date stamp, compression |
| QR generation | Client/server QR library | Event QR codes |
| Offline queue | IndexedDB | Retry failed uploads |
| Realtime | Supabase Realtime, if needed | Gallery updates |
| Optional server processing | Supabase Edge Functions | Future/heavier image processing |
| Optional archive | Google Drive API | Post-event export |

Do not add Cloudflare R2 unless a future scale/cost analysis justifies it.

---

# 21. Database Schema

Suggested MVP tables.

## events

```text
id
name
couple_name
event_date
slug
access_token
status
film_preset_id
guest_photo_limit
created_at
updated_at
```

## guests

```text
id
event_id
first_name
last_name
session_id
created_at
last_active_at
```

## photos

```text
id
event_id
guest_id
original_path
processed_path
status
filter_preset
captured_at
uploaded_at
is_hidden
created_at
```

## film_presets

```text
id
name
brightness
contrast
saturation
warmth
grain
vignette
date_stamp_enabled
border_enabled
border_type
created_at
```

A future implementation may add:

## upload_jobs

```text
id
photo_id
guest_id
status
attempt_count
last_attempt_at
error_message
created_at
updated_at
```

This is useful if upload reliability becomes more sophisticated.

---

# 22. Security

Important security principles:

1. Never expose Supabase service-role keys in the browser.
2. Use public event tokens that are random and non-guessable.
3. Use Row Level Security (RLS) for database access.
4. Use Storage policies for file access.
5. Validate event status before allowing uploads.
6. Validate that a guest session belongs to the event.
7. Enforce photo limits server-side.
8. Restrict admin routes to authenticated admin users.
9. Never trust guest-provided filenames or paths.
10. Validate image MIME types and file sizes.
11. Sanitize guest names before rendering.
12. Do not expose internal database IDs unnecessarily.

---

# 23. Photo Size / Performance Strategy

Phones can produce very large images.

Do not upload a 12–48 MP original directly as the primary gallery image.

The client should:

1. Capture image.
2. Resize to a sensible maximum dimension.
3. Apply film effect.
4. Compress.
5. Upload processed version.
6. Optionally upload original separately.

A sensible starting target for processed gallery photos is approximately:

- Long edge: 1600–2400 px
- JPEG quality: roughly 80–90

Tune this based on real-world testing.

The goal is high visual quality without making uploads unnecessarily large.

---

# 24. Camera Compatibility

The application should primarily target modern:

- iPhone Safari
- Android Chrome
- Android Samsung Internet
- Desktop browsers for admin

Use browser camera APIs rather than requiring native apps.

The app must handle:

- Camera permission denied
- Camera unavailable
- Front camera unavailable
- Rear camera unavailable
- Browser incompatibility
- User switching away from the app
- Orientation changes

If camera access fails, provide a graceful fallback allowing the user to select an existing photo from their device.

---

# 25. PWA Considerations

The application should be installable as a PWA eventually, but installation should never be required.

A guest should be able to use:

`Scan QR → Browser → Camera`

without installing anything.

PWA features can later improve:

- Offline behavior
- Home-screen access
- Caching
- Faster repeat visits

---

# 26. UX Requirements

The guest flow should require as few taps as possible.

Target:

```text
SCAN
 ↓
JOIN
 ↓
NAME
 ↓
CAMERA
 ↓
SHOOT
```

Avoid:

- Login screens
- Account creation
- Passwords
- Email verification
- Complex menus
- Settings pages for guests
- Excessive explanations
- Social-media-style engagement features

The wedding is the experience. The app should stay out of the way.

---

# 27. Visual Design Direction

The supplied HTML mockup is the visual reference for the implementation.

Preserve its overall visual language rather than replacing it with a generic component library aesthetic.

Desired characteristics:

- Light
- Warm
- Simple
- Retro-inspired
- Editorial
- Slightly analog
- Tactile
- Minimal
- Human

Avoid:

- Futuristic gradients
- Glassmorphism
- Dark UI
- Neon
- Excessive animations
- Overly rounded "SaaS" cards
- Generic dashboard styling
- Excessive icons
- Excessive shadows

The visual language should feel like:

**"A disposable camera redesigned as a beautiful digital object."**

---

# 28. Suggested MVP Routes

```text
/
    Landing / optional marketing page

/camera/[eventToken]
    Wedding welcome

/camera/[eventToken]/join
    Guest name entry

/camera/[eventToken]/shoot
    Camera

/camera/[eventToken]/photo/[photoId]
    Photo preview

/camera/[eventToken]/roll
    Shared wedding roll

/admin
    Admin login

/admin/events/[eventId]
    Event dashboard

/admin/events/[eventId]/photos
    Photo management

/admin/events/[eventId]/qr
    QR management
```

Exact routing can be adjusted to match the existing HTML mockup.

---

# 29. MVP Acceptance Criteria

The MVP is successful when:

- A couple can create an event.
- The event generates a unique QR code.
- A guest can scan the QR code on a phone.
- The guest can enter their name without creating an account.
- The guest can access the device camera.
- The guest can take a photo.
- The photo receives the selected film treatment.
- The photo receives a date stamp/frame where configured.
- The photo is stored locally before upload where necessary.
- The photo uploads to Supabase Storage.
- The photo is associated with the correct guest and event.
- The photo appears in the shared wedding roll.
- The guest can view/download their photo.
- Admin can view all photos.
- Admin can hide/delete photos.
- Admin can download the photo collection.
- The system does not expose service-role credentials.
- The experience remains usable on mobile Safari and Chrome.

---

# 30. Recommended Build Order

Do not build everything simultaneously.

### Phase 1 — Foundation

- [ ] Create Next.js application
- [ ] Connect Supabase
- [ ] Create database schema
- [ ] Create Storage bucket
- [ ] Implement environment variables
- [ ] Implement basic event model
- [ ] Implement admin authentication

### Phase 2 — Guest Flow

- [ ] Event QR generation
- [ ] QR/event validation
- [ ] Guest name entry
- [ ] Guest session
- [ ] Camera screen
- [ ] Camera permissions
- [ ] Front/back camera switching

### Phase 3 — Photography

- [ ] Capture image
- [ ] Canvas processing
- [ ] Resize/compression
- [ ] Film preset
- [ ] Date stamp
- [ ] Photo preview
- [ ] Retake/keep flow

### Phase 4 — Upload

- [ ] Supabase Storage upload
- [ ] Photo database record
- [ ] Upload progress
- [ ] Upload failure handling
- [ ] IndexedDB queue
- [ ] Automatic retry

### Phase 5 — Gallery

- [ ] Shared roll
- [ ] Individual photo view
- [ ] Download photo
- [ ] Near-real-time updates

### Phase 6 — Admin

- [ ] Dashboard
- [ ] Guest list
- [ ] Photo moderation
- [ ] QR management
- [ ] Bulk download

### Phase 7 — Wedding Hardening

Before the wedding, test:

- [ ] 1 guest
- [ ] 10 simultaneous guests
- [ ] 50 simultaneous guests
- [ ] 100+ simultaneous uploads
- [ ] Weak Wi-Fi
- [ ] Cellular-only
- [ ] No connection
- [ ] iPhone Safari
- [ ] Android Chrome
- [ ] Camera permission denied
- [ ] Browser refresh during upload
- [ ] Phone locked during upload
- [ ] Event closed
- [ ] Photo limit reached
- [ ] Storage failure
- [ ] Duplicate uploads

---

# 31. Important Implementation Philosophy

Build the simplest reliable version first.

Do not introduce Cloudflare, a dedicated backend server, a native mobile application, or an external image-processing service unless there is a demonstrated need.

The initial architecture should be:

**Next.js + Supabase + Canvas + Vercel**

Supabase handles:

- Database
- Storage
- Authentication/session infrastructure
- Access control
- Optional realtime functionality

The browser handles:

- Camera
- Photo processing
- Film effects
- Date stamp
- Compression
- Local upload queue

Vercel handles:

- Hosting
- Next.js deployment

This keeps the entire application relatively small, inexpensive, and easy to maintain.

---

# 32. Future Features — Do Not Build in MVP

Potential later features:

- Multiple camera/film presets
- 27/36 exposure film rolls
- Photo prompts/challenges
- Live reception slideshow
- AI grouping by people
- "Photos of me"
- Audio messages
- Short video clips
- Guest messages
- Favorite photos
- Wedding photo book generation
- Google Drive export
- Printed disposable-camera-style album
- Multiple events per account
- Custom domains
- Custom wedding monogram/watermark
- QR codes for individual tables
- Table-specific photo challenges

These should not complicate the initial architecture.

---

# 33. Key Product Differentiator

The app should not position itself as:

**"A place for guests to upload wedding photos."**

The product experience should be:

**"Everyone gets a disposable camera."**

That distinction should influence the UX, copy, animation, photo treatment, and overall design.

The goal is for the final collection to feel less like a random collection of phone uploads and more like:

**one giant disposable camera shared by everyone at the wedding.**
