# Frontend

Vite + React application. Desktop-first responsive design. Follows the Sortd Design System defined in `DESIGN.md`.

---

## Routing

React Router v6. Four tabs + detail views.

```javascript
<Routes>
  <Route path="/" element={<Inbox />} />
  <Route path="/lists" element={<Lists />} />
  <Route path="/lists/:id" element={<ListView />} />
  <Route path="/add" element={<AddContent />} />
  <Route path="/settings" element={<Settings />} />
  <Route path="/notes/:id" element={<NoteDetail />} />
</Routes>
```

---

## App Shell

`App.jsx` — the layout wrapper for all pages.

- Top: nothing (content starts at top, no header bar)
- Center: `<Outlet />` for routed pages
- Bottom: `<BottomNav />` fixed at screen bottom
- Floating: `<QueueStatus />` in bottom-right corner above nav

---

## Components

### `BottomNav.jsx`

Fixed bottom navigation bar. 4 tabs.

```
┌────────────────────────────────────┐
│  📥 Inbox  │ 📂 Lists │ ➕ Add │ ⚙️ Settings │
└────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Height | 48px minimum |
| Position | `fixed`, bottom: 0 |
| Background | `#ffffff` with top whisper border |
| Active tab | Sortd Blue `#0075de` icon + text + `rgba(0,117,222,0.08)` background |
| Inactive tab | Warm Gray `#a39e98` |
| Label font | 12px Inter weight 600, letter-spacing 0.125px |
| Safe area | `padding-bottom: env(safe-area-inset-bottom)` |
| Icons | Always paired with text labels. Never icon-only. |

Uses `NavLink` from React Router for active state detection.

### `NoteCard.jsx`

Card component for displaying a note in list views.

| Property | Value |
|----------|-------|
| Background | `#ffffff` |
| Border | `1px solid rgba(0,0,0,0.1)` (whisper) |
| Radius | 12px |
| Shadow | 4-layer card shadow from DESIGN.md |
| Padding | 16px |
| Title | 18px Inter weight 700, line-height 1.33 |
| Excerpt | 14px Inter weight 400, color `#615d59`, 2-line clamp |
| Source badge | Pill: `#f2f9ff` bg, `#097fe8` text, 12px weight 600 |
| Timestamp | 12px `#a39e98` |
| Thumbnail | If present: 100% width, top-rounded (12px 12px 0 0), aspect-ratio preserved |
| Tap | Navigates to `/notes/:id` |
| Missing thumbnail | Shows platform icon in a colored circle instead |

### `ListCard.jsx`

Card for the Lists grid view.

| Property | Value |
|----------|-------|
| Layout | Emoji (32px) + name + count badge, stacked vertical |
| Background | `#ffffff` |
| Border | Whisper border |
| Radius | 12px |
| Shadow | Card shadow |
| Emoji | 32px font size |
| Name | 16px weight 600 |
| Count | Pill badge: `#f2f9ff` bg, `#097fe8` text, 12px weight 600 |
| Tap | Navigates to `/lists/:id` |

### `TagPill.jsx`

Small pill for displaying tags.

| Property | Value |
|----------|-------|
| Background | `#f2f9ff` |
| Text | `#097fe8`, 12px weight 600, letter-spacing 0.125px |
| Radius | 9999px (full pill) |
| Padding | 4px 8px |
| Click | Navigates to filtered view (list with `?tag=name`) |

### `UploadZone.jsx`

Drag-and-drop area for screenshot uploads.

| Property | Value |
|----------|-------|
| Border | `2px dashed rgba(0,0,0,0.15)` |
| Background | `#f6f5f4` (warm white) |
| Radius | 12px |
| Height | 200px minimum |
| Drag-over | Border color → Sortd Blue, background → `rgba(0,117,222,0.04)` |
| Accepts | `.png, .jpg, .jpeg, .webp, .bmp, .tiff` |
| After drop | Shows image preview with progress bar |
| Fallback | Hidden `<input type="file">` triggered by click |

Calls `POST /api/process-image` with FormData. Receives `{ jobId }` → listens on SSE for completion.

### `ProcessingOverlay.jsx`

Animated processing state indicator.

| Property | Value |
|----------|-------|
| Type | Non-blocking toast/banner at top of current page |
| Steps shown | "Downloading → Extracting → Summarizing" |
| Animation | Step dots with pulse animation, current step highlighted |
| On completion | Toast auto-dismisses after 3s, with "View note" link |
| On failure | Toast with error message, warm orange background |
| Data source | SSE events: `job_started` (step updates), `job_done`, `job_failed` |

### `QueueStatus.jsx`

Floating indicator showing queue activity.

| Property | Value |
|----------|-------|
| Position | Fixed, bottom-right, above BottomNav |
| Idle state | Hidden (no UI when queue is empty) |
| Active state | Small pill: "Processing 2 of 5..." with animated spinner |
| Tap | Expands to show job list with status |
| Data source | `GET /api/queue/stats` + SSE events |

---

## Pages

### `Inbox.jsx` — `/`

The default landing view. Shows all notes sorted by newest first.

- Fetches `GET /api/notes` (no `list_id` filter)
- Renders `<NoteCard />` for each note
- **Quick-assign buttons**: each card shows pill buttons for top 3 lists, tap to reassign (`PATCH /api/notes/:id`)
- **Pull to refresh**: on mobile, pull down gesture re-fetches notes
- **Empty state**: centered illustration + "Paste a URL or drop a screenshot to get started"
- **Search bar**: at top, filters via `?search=` query param

### `Lists.jsx` — `/lists`

Grid of all lists.

- Fetches `GET /api/lists`
- Renders `<ListCard />` in responsive grid (2 cols on mobile, 3 on tablet, 4 on desktop)
- **"Create New List" card** at the end with `+` icon and dashed border
- Create dialog: name input, emoji text input (user types the emoji character directly — no emoji picker component), color picker
- Search bar at top filters lists by name

### `ListView.jsx` — `/lists/:id`

Notes within a specific list.

- Fetches `GET /api/notes?list_id=:id`
- Header: emoji + list name + note count
- Compact `<NoteCard />` rendering (smaller cards, no thumbnails in compact mode)
- **Tag filter chips**: horizontal scroll of `<TagPill />` at top, click to filter
- **Sort**: newest first (default), starred first (toggle)
- **Swipe actions** (mobile): swipe right → star, swipe left → delete with confirmation

### `AddContent.jsx` — `/add`

The primary capture screen. Three input methods.

**URL Input Section:**
- Large text input with paste detection
- "Process" button (Sortd Blue)
- On submit: `POST /api/process-url` → shows `<ProcessingOverlay />`
- Validates URL format before submitting

**Upload Section:**
- `<UploadZone />` component
- Or tap to browse files

**Manual Note Section:**
- Title input + multiline content textarea
- "Save" button → `POST /api/notes` (direct create, no queue needed)

**Queue Section:**
- `<QueueStatus />` expanded view showing all active/pending jobs

### `NoteDetail.jsx` — `/notes/:id`

Full note view.

- Fetches `GET /api/notes/:id`
- **Title**: editable inline (click to edit, blur to save). On save failure: revert to previous value and show a red toast error — never silent failure.
- **AI Summary**: the `content` field, displayed prominently
- **Raw Text**: collapsible section showing `raw_text` (transcript or OCR output)
- **Source attribution**: platform icon + clickable link to source URL
- **Tags**: row of `<TagPill />` components + "Add tag" button
- **List assignment**: dropdown to move note to a different list
- **Star toggle**: star icon in top-right
- **Delete**: red text button at bottom with confirmation dialog
- All edits call `PATCH /api/notes/:id`

### `Settings.jsx` — `/settings`

Configuration page.

- **Gemini API Key**: masked input field, "Save" button → `POST /api/settings/gemini-key`
  - Shows green checkmark if key is set, red X if not
  - Never displays the actual key value
- **Folder Watch**: path input + Start/Stop toggle → `POST /api/folder-watch/start|stop`
  - Shows current watch status + path
- **Queue Stats**: read from `GET /api/queue/stats`
  - Jobs today, success rate %, API calls remaining
- **Default Lists**: read-only display of the 10 default lists
- **About**: version, links

---

## Design Token Usage

The frontend uses CSS custom properties defined in `index.css`. Every component references tokens, never hardcoded values.

### Colors (from DESIGN.md)

```css
:root {
  --color-bg:           #ffffff;
  --color-bg-warm:      #f6f5f4;
  --color-text:         rgba(0,0,0,0.95);
  --color-text-secondary: #615d59;
  --color-text-muted:   #a39e98;
  --color-accent:       #0075de;
  --color-accent-hover: #005bab;
  --color-accent-focus: #097fe8;
  --color-badge-bg:     #f2f9ff;
  --color-badge-text:   #097fe8;
  --color-border:       rgba(0,0,0,0.1);
  --color-dark:         #31302e;
}
```

### Spacing (8pt grid)

```css
:root {
  --space-2:  2px;   --space-4:  4px;   --space-8:  8px;
  --space-12: 12px;  --space-16: 16px;  --space-20: 20px;
  --space-24: 24px;  --space-32: 32px;  --space-48: 48px;
  --space-64: 64px;
}
```

### Shadows

```css
:root {
  --shadow-card: rgba(0,0,0,0.04) 0px 4px 18px,
                 rgba(0,0,0,0.027) 0px 2.025px 7.85px,
                 rgba(0,0,0,0.02) 0px 0.8px 2.93px,
                 rgba(0,0,0,0.01) 0px 0.175px 1.04px;
  --shadow-deep: rgba(0,0,0,0.01) 0px 1px 3px,
                 rgba(0,0,0,0.02) 0px 3px 7px,
                 rgba(0,0,0,0.02) 0px 7px 15px,
                 rgba(0,0,0,0.04) 0px 14px 28px,
                 rgba(0,0,0,0.05) 0px 23px 52px;
}
```

### Typography

```css
:root {
  --font-family: 'Inter', -apple-system, system-ui, sans-serif;
  --font-page-title:    700 26px/1.23 var(--font-family);
  --font-section:       700 22px/1.27 var(--font-family);
  --font-card-title:    700 18px/1.33 var(--font-family);
  --font-body:          400 16px/1.50 var(--font-family);
  --font-body-medium:   500 16px/1.50 var(--font-family);
  --font-body-semibold: 600 16px/1.50 var(--font-family);
  --font-nav-label:     600 12px/1.33 var(--font-family);
  --font-caption:       400 14px/1.43 var(--font-family);
  --font-badge:         600 12px/1.33 var(--font-family);
}
```

### Radii

```css
:root {
  --radius-button: 4px;
  --radius-card:   12px;
  --radius-hero:   16px;
  --radius-pill:   9999px;
}
```

---

## PWA Share Target Manifest

> ⚠️ **Hackathon note:** The share target requires HTTPS and an installed PWA. Skip for localhost demo. The manifest and service worker below are specced for post-hackathon implementation only.

This is the critical PWA feature that lets users share URLs from mobile browsers directly to Sortd. The manifest goes in `client/public/manifest.json`.

```json
{
  "name": "Sortd",
  "short_name": "Sortd",
  "description": "Capture and organize content from reels, videos, and screenshots",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0075de",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "share_target": {
    "action": "/share",
    "method": "POST",
    "enctype": "application/x-www-form-urlencoded",
    "params": {
      "url": "url",
      "title": "title",
      "text": "text"
    }
  }
}
```

> **Why `POST` not `GET`?** `GET` appends the shared URL as a query param. Long Instagram/TikTok URLs exceed browser query string limits. Some platforms pass the URL in the `text` field, not `url`. `POST` avoids both issues.

### How Share Target Works

1. User installs Sortd as a PWA (Chrome "Install app" prompt)
2. User is on Instagram, taps Share → "Sortd" appears in share sheet
3. Android/Chrome sends a `POST` to `/share` with form-encoded body `{ url, title, text }`
4. The **service worker** intercepts the POST, extracts the URL (from `url` or `text` field), and redirects to `/add?url=...`
5. `AddContent.jsx` reads `url` from query params on mount
6. Auto-populates the URL input and auto-submits to `POST /api/process-url`

### Service Worker Share Handler

Add to the custom service worker (or Workbox `additionalManifestEntries`):

```javascript
// In service worker
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === '/share' && event.request.method === 'POST') {
    event.respondWith((async () => {
      const formData = await event.request.formData();
      const sharedUrl = formData.get('url') || formData.get('text') || '';
      return Response.redirect(`/add?url=${encodeURIComponent(sharedUrl)}`, 303);
    })());
    return;
  }
});
```

### Vite PWA Config

In `vite.config.js`:

```javascript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,     // we use our own manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // NOTE: localhost pattern works for dev/hackathon. For production,
        // use a relative URL pattern or env-based origin.
        runtimeCaching: [{
          urlPattern: /^http:\/\/localhost:3001\/api\//,
          handler: 'NetworkFirst',
          options: { cacheName: 'api-cache' },
        }],
        // Handle share target POST → redirect in service worker
        navigateFallback: 'index.html',
      },
    }),
  ],
});
```

---

## API Client

`src/api.js` — wrapper around fetch for all backend calls.

```javascript
const API_BASE = 'http://localhost:3001/api';

export const api = {
  // Notes
  getNotes: (params) => get('/notes', params),
  getNote: (id) => get(`/notes/${id}`),
  updateNote: (id, data) => patch(`/notes/${id}`, data),
  deleteNote: (id) => del(`/notes/${id}`),

  // Lists
  getLists: () => get('/lists'),
  createList: (data) => post('/lists', data),
  updateList: (id, data) => patch(`/lists/${id}`, data),
  deleteList: (id) => del(`/lists/${id}`),

  // Processing (returns { jobId }, listen on SSE for result)
  processUrl: (url) => post('/process-url', { url }),
  processImage: (file) => postFile('/process-image', file),

  // Queue
  getQueueStats: () => get('/queue/stats'),

  // Folder Watch
  getWatchStatus: () => get('/folder-watch'),
  startWatch: (path) => post('/folder-watch/start', { path }),
  stopWatch: () => post('/folder-watch/stop'),

  // Settings
  getSettings: () => get('/settings'),
  setGeminiKey: (key) => post('/settings/gemini-key', { key }),
};
```

---

## SSE Hook

Custom React hook for subscribing to server events.

```javascript
// src/hooks/useSSE.js
import { useState, useEffect, useCallback, useRef } from 'react';

export function useSSE() {
  const [events, setEvents] = useState([]);
  const eventsRef = useRef([]);

  useEffect(() => {
    const es = new EventSource('http://localhost:3001/api/events');

    const eventNames = ['job_queued', 'job_started', 'job_done', 'job_failed', 'watch_status'];
    eventNames.forEach(name => {
      es.addEventListener(name, (e) => {
        const event = { type: name, data: JSON.parse(e.data), id: Date.now() };
        eventsRef.current = [...eventsRef.current, event];
        setEvents([...eventsRef.current]);  // trigger re-render
      });
    });

    return () => es.close();
  }, []);

  // Stable reference — no stale closure risk.
  // Consumers call consumeEvents() to drain the queue and clear it.
  const consumeEvents = useCallback(() => {
    const pending = eventsRef.current;
    eventsRef.current = [];
    setEvents([]);
    return pending;
  }, []);  // no deps — eventsRef is stable

  return { events, consumeEvents };
}
```

> **Why a ref + state?** The ref (`eventsRef`) is the source of truth — it's always current, never stale. The state (`events`) exists only to trigger re-renders. `consumeEvents` has a stable identity (empty deps) so it's safe to use in any `useEffect` without causing infinite loops.

Components that need real-time updates (`ProcessingOverlay`, `QueueStatus`, `Inbox`) consume this hook, process the event queue in `useEffect`, and clear handled events via `consumeEvents()`.
