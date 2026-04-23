# Hackathon — 24hr Build Guide

Opinionated execution plan. No fluff.

---

## Decisions (Resolved)

| Question | Answer |
|----------|--------|
| API key storage | `.env` on backend. Not localStorage. |
| Queue persistence | In-memory. Server restart loses pending jobs. Fine for 24hr. |
| Max concurrent Gemini calls | 2. Not configurable in v1. |
| Instagram cookies | Support `--cookies-from-browser chrome`. Document it, don't hide it. |
| Mobile or desktop? | Desktop-first localhost tool. Responsive, but not a PWA-first product. |

---

## Hour 1: Prove the Pipeline (PHASE 0)

**Do this before writing a single React component.**

### Smoke Test Script

Create `server/services/__tests__/ytdlp-platforms.test.js`:

```bash
# Install yt-dlp if not present
pip install yt-dlp
# Or: brew install yt-dlp

# Verify it works
yt-dlp --version

# Test YouTube Shorts (should always work)
yt-dlp -x --audio-format mp3 --max-filesize 25m -o "test_yt.%(ext)s" \
  "https://www.youtube.com/shorts/dQw4w9WgXcQ"

# Test TikTok (moderate risk)
yt-dlp -x --audio-format mp3 --max-filesize 25m \
  --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  -o "test_tt.%(ext)s" \
  "https://www.tiktok.com/@<some-public-video>"

# Test Instagram (high risk — needs cookies)
yt-dlp -x --audio-format mp3 --max-filesize 25m \
  --cookies-from-browser chrome \
  -o "test_ig.%(ext)s" \
  "https://www.instagram.com/reel/<some-reel-id>/"

# Clean up
rm -f test_yt.* test_tt.* test_ig.*
```

### Expected Results

| Platform | Likely Result | Action |
|----------|-------------|--------|
| YouTube | ✅ Works | Ship it |
| TikTok | ✅ Probably works | Ship it |
| Instagram | ⚠️ Fails without cookies | Document the cookie requirement. Demo with YouTube instead. |

**If YouTube fails:** yt-dlp or ffmpeg is broken. Fix before proceeding.

### Also Test Gemini

```bash
# Quick API test
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Return valid JSON: {\"test\": true}"}]}],"generationConfig":{"responseMimeType":"application/json"}}'
```

**If this fails:** your API key is wrong or rate-limited. Fix now.

---

## Build Order

### Hour 1-2: Backend Foundation

```
1. npm init + install deps (express, better-sqlite3, cors, multer, uuid,
   node-fetch, open-graph-scraper, tesseract.js, chokidar)
2. server/services/database.js — schema with junction tables, seed lists, CRUD
3. server/services/tempFiles.js — temp file helpers
4. server/services/gemini.js — categorizeContent() + transcribeAudio()
5. server/index.js — Express app, notes/lists CRUD routes, settings route
6. TEST: start server, hit /api/lists, /api/notes — confirm CRUD works
```

### Hour 2-4: Processing Pipelines

```
7. server/services/videoProcessor.js — yt-dlp + Gemini integration
8. server/services/imageProcessor.js — Tesseract + Gemini
9. Wire POST /api/process-url and /api/process-image (synchronous first, queue later)
10. TEST: paste a YouTube URL → verify note appears in /api/notes
11. TEST: upload a screenshot → verify OCR + note creation
```

### Hour 4-5: Queue + SSE

```
12. server/services/queue.js — job queue + rate limiter
13. Add SSE endpoint (GET /api/events)
14. Rewire process-url and process-image to enqueue (return 202 + jobId)
15. TEST: paste 3 URLs rapidly → verify they queue and process sequentially
```

### Hour 5-6: Folder Watcher

```
16. server/services/folderWatcher.js — Chokidar → queue.enqueue()
17. Wire /api/folder-watch routes
18. TEST: start watching ~/Screenshots, drop an image, verify auto-processing
```

### Hour 6-8: Frontend Foundation

```
19. npx create-vite@latest ./client --template react
20. Install deps: react-router-dom, vite-plugin-pwa
21. client/src/index.css — full design system tokens from DESIGN.md
22. client/src/api.js — API client
23. client/src/App.jsx — shell with React Router + BottomNav
```

### Hour 8-11: Components

```
24. BottomNav.jsx — 4 tabs, active state
25. NoteCard.jsx — card with all DESIGN.md styling
26. ListCard.jsx — emoji + name + count
27. TagPill.jsx — small pill
28. UploadZone.jsx — drag-drop + file input
29. ProcessingOverlay.jsx — SSE-driven toast
30. QueueStatus.jsx — floating indicator
```

### Hour 11-16: Pages

```
31. Inbox.jsx — note feed + search
32. Lists.jsx — grid of lists + create new
33. ListView.jsx — notes in a list
34. AddContent.jsx — URL input + upload + manual note
35. NoteDetail.jsx — full note view + edit
36. Settings.jsx — API key + folder watch + queue stats
```

### Hour 16-20: Polish

```
37. Empty states with illustrations
38. Loading states and skeleton cards
39. Error handling (no API key, no yt-dlp, rate limit)
40. Transitions and micro-animations
41. Responsive breakpoints (375px, 768px, 1200px)
```

### Hour 20-24: Demo Prep

```
42. Seed 5-10 real notes from real URLs
43. Test full flow end-to-end 3 times
44. Record demo video
45. Write README
```

---

## Priority Tiers

### Must-Have (demo or die)

| Feature | Why |
|---------|-----|
| Paste URL → note created | Core value prop. If this doesn't work, nothing matters. |
| YouTube + TikTok extraction | At least 2 platforms must work. |
| Metadata-only fallback | When yt-dlp fails, note still gets created from OG data. |
| Screenshot upload → OCR → note | Second input method. |
| Notes CRUD | View, edit, delete notes. |
| Lists with auto-categorization | Gemini assigns to the right list. |
| Bottom nav with 4 tabs | Navigation. |
| Inbox + Lists + Add screens | Minimum viable UI. |

### Nice-to-Have (build if time permits)

| Feature | Why |
|---------|-----|
| Folder watcher | Cool demo moment but not critical. |
| Processing queue | Prevents race conditions but sync processing works for demos. |
| Tag filtering | Tags are stored, but filtering UI is extra. |
| NoteDetail editing | View-only is fine for demo. |
| Settings page | Hardcode API key in .env, hardcode watch path. |
| SSE real-time updates | Polling every 2s is fine for demo. |
| Pull-to-refresh | Tap refresh icon instead. |
| Swipe actions | Use button-based actions. |

### Skip (don't even start)

| Feature | Why |
|---------|-----|
| Dark mode | CSS variables make this possible later, don't build now. |
| PWA install / share target | Needs HTTPS. Localhost demo doesn't need it. |
| Authentication | Localhost-only. |
| Manual note creation | Paste URL and upload cover the demo. |
| Emoji picker for lists | Hardcode emojis. |
| Export/import | Post-hackathon feature. |

---

## Demo Script

**Goal:** 90 seconds. Show the core loop 3 times with different inputs.

### Setup (before demo)
- Server running on :3001
- Frontend running on :5173
- Gemini API key in `.env`
- SQLite seeded with default lists (auto on first run)
- One pre-existing note in Inbox (so it's not empty)

### Script

**1. Open the app (5s)**
Show the Inbox with 1 existing note. "This is Sortd — it captures content from social media and organizes it automatically."

**2. Paste a YouTube Shorts URL (20s)**
- Go to Add tab
- Paste URL into input
- Hit Process
- Show the processing overlay: "Downloading → Transcribing → Summarizing"
- Note appears in Inbox with AI-generated title, summary, and auto-assigned list
- "It downloaded the audio, transcribed it with Gemini, and categorized it into Learn."

**3. Upload a screenshot (20s)**
- Stay on Add tab
- Drag a screenshot of a recipe into the upload zone
- Show OCR processing
- Note appears with extracted text, summary, and auto-assigned to Recipes
- "OCR extracted the text, Gemini recognized it as a recipe."

**4. Show the Lists view (15s)**
- Go to Lists tab
- Show the grid: Inbox has 1, Learn has 1, Recipes has 1
- Tap into Learn → show the YouTube note
- "Everything is automatically sorted. No manual tagging."

**5. Show a note detail (10s)**
- Tap the YouTube note
- Show: title, AI summary, full transcript, tags, source link
- "The full transcript is searchable. The original URL is saved."

**6. (If folder watcher works) Bonus demo (20s)**
- Go to Settings → start folder watcher on a test folder
- Drop a screenshot into the folder
- Show real-time SSE notification
- "It watches your screenshots folder and auto-processes everything."

### Key Phrases for Demo
- "Zero manual input — paste a link, get an organized note"
- "Works with Instagram reels, YouTube shorts, TikTok"
- "AI-powered categorization into smart lists"
- "Full transcripts are searchable"
- "Local-first — your data stays on your machine"

---

## Biggest Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| yt-dlp fails on Instagram | HIGH | Demo with YouTube. Mention Instagram as "supported with browser cookies." |
| Gemini rate limit during demo | LOW (unless you burned calls testing) | Pre-seed notes. Only do 2-3 live API calls during demo. |
| Tesseract OCR is slow | MODERATE (3-8s per image) | Use a small, text-heavy screenshot. Show a loading spinner. |
| SQLite migration breaks | LOW | Start fresh (delete `sortd.db`). No real data to lose. |
| yt-dlp not installed on demo machine | HIGH if using someone else's laptop | Check in hour 1. Add `yt-dlp --version` to startup checks. |
| Frontend looks basic | MODERATE | Invest hours 16-20 in polish. The DESIGN.md system is strong — just implement the tokens. |

---

## Quick Reference

### Start Everything

```bash
# Terminal 1: Backend
cd server
cp .env.example .env  # add your GEMINI_API_KEY
npm install
npm run dev

# Terminal 2: Frontend
cd client
npm install
npm run dev
```

### Key Environment Variables

```bash
# server/.env
GEMINI_API_KEY=your-gemini-api-key
PORT=3001
```

### Verify Backend

```bash
curl http://localhost:3001/api/lists | jq
curl http://localhost:3001/api/settings | jq
```

### Reset Database

```bash
rm server/sortd.db
# Restart server — fresh DB with default lists
```

### Update yt-dlp (do this if extraction fails)

```bash
pip install --upgrade yt-dlp
# or
yt-dlp -U
```
