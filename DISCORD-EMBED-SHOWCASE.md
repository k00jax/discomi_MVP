# DiscOmi - Polished Discord Embed Showcase

## 🎨 What's New

Your Discord embeds now look **professional and informative** with:

### ✨ Visual Enhancements
- **Category-based emoji** - Each memory type gets its own icon (🧠 💼 📅 ✅ 💡 🎧)
- **Color-coded embeds** - Different colors for different categories
- **Human-friendly timestamps** - "Oct 16, 1:26 PM • 2 minutes ago"
- **Thumbnail support** - First photo appears as embed thumbnail
- **Omi branding** - Custom bot name/avatar and Omi icon in author

### 📊 Metadata Fields
Smart display of optional Omi metadata:
- **When** - Formatted timestamp with relative time
- **Category** - personal, work, meeting, task, idea
- **Location** - City, Country (if geolocation available)
- **Language** - Language code (if detected)
- **Source** - Device source (e.g., "omi_necklace")
- **Status** - Memory status (if present)

### 🔘 Action Buttons
- **"Open in Omi" button** - Deep link to memory in Omi app (when URL available)

## 🎭 Category Mapping

### Emoji by Category
```
🧠 personal   - Personal thoughts and notes
💼 work       - Work-related conversations
📅 meeting    - Meetings and appointments
✅ task       - Tasks and to-dos
💡 idea       - Ideas and brainstorming
🎧 default    - All other memories
```

### Colors by Category
```
🧠 personal   - #6c5ce7 (Purple)
💼 work       - #0984e3 (Blue)
📅 meeting    - #00b894 (Teal)
✅ task       - #55efc4 (Mint)
💡 idea       - #fdcb6e (Yellow)
🎧 default    - #8e8e93 (Gray)
```

## 📝 Example Embed

**Raw Omi Payload:**
```json
{
  "id": 123,
  "created_at": "2025-10-16T13:26:00.000Z",
  "structured": {
    "title": "Building a Discord Integration with OMI",
    "category": "idea",
    "overview": "Discussed creating a seamless integration between Omi and Discord to share memories in real-time. Focus on clean embed design and per-user configuration."
  },
  "language": "en",
  "source": "omi_necklace",
  "geolocation": {
    "city": "San Francisco",
    "country": "United States"
  },
  "photos": [
    { "url": "https://example.com/photo1.jpg" }
  ],
  "url": "https://omi.me/memories/123"
}
```

**Discord Embed Result:**

```
╔═══════════════════════════════════════════════════╗
║ 💡 Building a Discord Integration with OMI       ║
║ (Click to open)                                   ║
╠═══════════════════════════════════════════════════╣
║ 🎯 Omi                                            ║
║                                                   ║
║ Discussed creating a seamless integration        ║
║ between Omi and Discord to share memories in     ║
║ real-time. Focus on clean embed design and       ║
║ per-user configuration.                           ║
║                                                   ║
║ ┌─────────────┬──────────────┬─────────────────┐ ║
║ │ When        │ Category     │ Location        │ ║
║ │ Oct 16,     │ idea         │ San Francisco,  │ ║
║ │ 1:26 PM •   │              │ United States   │ ║
║ │ 2m ago      │              │                 │ ║
║ ├─────────────┼──────────────┼─────────────────┤ ║
║ │ Language    │ Source       │                 │ ║
║ │ en          │ omi_necklace │                 │ ║
║ └─────────────┴──────────────┴─────────────────┘ ║
║                                                   ║
║ [📱 Open in Omi]  ← Clickable button             ║
║                                                   ║
║ 🎧 Conversation • 123                             ║
║ Oct 16, 2025 1:28 PM                              ║
╚═══════════════════════════════════════════════════╝
```

**Features shown:**
- 💡 Emoji and yellow color for "idea" category
- Clickable title linking to Omi memory
- Omi icon in author section
- Clean metadata fields (inline layout)
- "Open in Omi" action button
- Thumbnail from first photo (right side)
- Footer with conversation ID
- Relative timestamp

## ⚙️ Customization

### Branding (Optional)

Set these environment variables in Vercel for custom branding:

```bash
NEXT_PUBLIC_BOT_NAME="DiscOmi"
NEXT_PUBLIC_BOT_AVATAR_URL="https://your-domain.com/bot-avatar.png"
NEXT_PUBLIC_OMI_ICON_URL="https://your-domain.com/omi-icon.png"
```

**Defaults:**
- Bot Name: `DiscOmi`
- Bot Avatar: Omi icon
- Omi Icon: `https://i.imgur.com/6WZ1Q8j.png`

### Text Length

Controlled per-user via options or global environment:

```typescript
// Per-user (via registration)
maxChars: 900  // Default for clean embeds

// Global override
POST_FULL_TEXT=true  // Uses 1900 chars max
```

### Debug Mode

When `DEBUG=true`, footer shows uid:
```
Conversation • 123 • uid:kyle
```

When `DEBUG=false`, clean footer:
```
Conversation • 123
```

## 🔍 Field Logic

All metadata fields are **optional and auto-hide** if not present:

```typescript
// Only shows if available in Omi payload
if (locationLabel) → "Location: San Francisco, United States"
if (language)      → "Language: en"
if (source)        → "Source: omi_necklace"
if (status)        → "Status: completed"
```

**Minimal embed** (no optional fields):
- Title with emoji
- Description (overview)
- When (always present)
- Category (always present, defaults to "default")

**Maximum embed** (all fields):
- Title with emoji
- Description
- When
- Category
- Location
- Language
- Source
- Status
- Thumbnail
- Action button

## 🎯 Benefits

### For Users:
- **Instantly recognizable** - Emoji and colors make scanning easy
- **Context-rich** - Metadata provides full picture without opening Omi
- **Mobile-friendly** - Clean inline fields work great on phones
- **Interactive** - One-click to open in Omi app

### For Developers:
- **Graceful degradation** - Works with minimal or full metadata
- **Type-safe** - All fields properly typed
- **Configurable** - Easy to adjust colors, emoji, branding
- **Debuggable** - DEBUG flag for troubleshooting

## 📊 Data Flow

```
Omi Memory Created
       ↓
Webhook POST to /api/webhook?token=...&uid=...
       ↓
Extract metadata:
  - title, overview
  - category, language, status, source
  - location (city, country)
  - photos (thumbnail)
  - url/deep_link
       ↓
Build Discord embed:
  - Select emoji & color by category
  - Format timestamp with Discord syntax
  - Add metadata fields (if present)
  - Add action button (if URL present)
  - Add thumbnail (if photo present)
       ↓
POST to user's Discord webhook
       ↓
Beautiful embed appears in Discord channel!
```

## 🚀 Deployment

```powershell
# Optional: Set branding variables
vercel env add NEXT_PUBLIC_BOT_NAME production
# Enter: DiscOmi

vercel env add NEXT_PUBLIC_BOT_AVATAR_URL production
# Enter: https://your-domain.com/avatar.png

# Deploy
vercel --prod --force
```

## ✅ What This Achieves

1. **Professional appearance** - Matches quality of premium Discord bots
2. **Information density** - Shows all relevant metadata without clutter
3. **User experience** - Easy to scan, mobile-friendly, interactive
4. **Flexibility** - Works with any metadata combination Omi sends
5. **Branding** - Customizable bot name, avatar, and icons
6. **Future-proof** - Easy to add new fields as Omi expands

---

**Git SHA**: `5069f5a`  
**Status**: Production-ready polished embeds  
**No breaking changes**: Fully backwards compatible
