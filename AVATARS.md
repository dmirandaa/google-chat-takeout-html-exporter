# Avatar System Documentation

This document explains how avatars work in the Google Chat HTML Exporter.

## Quick Start

**No configuration needed!** Just run:

```bash
npm start
```

Avatars will display automatically using Gravatar + fallback to colored initials.

## How It Works

The exporter uses a **simple two-tier system**:

### Avatar Methods (Priority Order)

1. **Gravatar** (Automatic)
   - Works for ANY email address worldwide
   - **No authentication required**
   - Free service maintained by Automattic
   - If user has Gravatar account: displays their profile picture
   - If user has no Gravatar: displays a geometric identicon (auto-generated)

2. **Colored Initials** (Fallback)
   - Generated automatically if Gravatar unavailable
   - Uses first letters of user's name
   - Consistent color per email (hash-based, 10 Material Design colors)
   - Always available as ultimate fallback

## Avatar Display Flow

```text
User Avatar Request
    ↓
Generate Gravatar URL with MD5 hash
    ↓
Gravatar service returns:
  - Real photo (if user has account)
  - Geometric identicon (if no account) ← default behavior
    ↓
Fallback: Display colored initials (if Gravatar fails)
```

## How Gravatar Works

[Gravatar](https://gravatar.com/) is a free service maintained by Automattic (WordPress company).

**Getting a Gravatar:**

1. Visit [gravatar.com](https://gravatar.com/)
2. Click "Create your own Gravatar"
3. Sign up with your email
4. Upload a profile picture
5. Save changes

After setup, your avatar will appear automatically next time HTML is exported.

**Gravatar Features:**

- ✅ Free to use
- ✅ No authentication needed in exporter
- ✅ Privacy-controlled (you choose visibility)
- ✅ Works globally
- ✅ Automatic identicons for non-account emails

## Technical Details

### Gravatar URL Generation

The exporter generates Gravatar URLs using email MD5 hashing:

```javascript
const email = "user@example.com";
const hash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?s=96&d=identicon`;
```

**URL Parameters:**

- `s=96` - Avatar size in pixels (96x96, optimized for 56px display with Retina scaling)
- `d=identicon` - Default: geometric identicon for non-account emails

**Example Gravatar URL:**

```text
https://www.gravatar.com/avatar/a1b2c3d4e5f6?s=96&d=identicon
```

### Color System

Each user gets a consistent color based on email hash:

```javascript
// 10 Material Design colors
const colors = [
  '#D32F2F', '#F57C00', '#FBC02D', '#689F38', '#388E3C',
  '#1976D2', '#1565C0', '#7B1FA2', '#C2185B', '#E64A19'
];

// Hash email to select a color
let hash = 0;
for (let i = 0; i < email.length; i++) {
  hash = ((hash << 5) - hash) + email.charCodeAt(i);
}
const colorIndex = Math.abs(hash) % colors.length;
const userColor = colors[colorIndex];
```

**Key property:** Same email always gets same color across all exports.

### Avatar Initials

Initials are extracted from user names:

```javascript
// Examples:
"Daniel Miranda" → "DM"
"John Doe" → "JD"
"Alice" → "A"
"Unknown" → "?"
```

## Privacy & Security

- ✅ **No user consent required** - Gravatar is public by default
- ✅ **Only email hashes sent** - Not actual email addresses
- ✅ **No authentication needed** - Works for any email
- ✅ **Zero configuration** - No API keys or setup required
- ✅ **HTTPS only** - All Gravatar requests encrypted
- ✅ **Static HTML** - No server-side calls needed

## Troubleshooting

### Problem: "All avatars showing colored initials"

**Possible causes:**

- Network connectivity issue
- Gravatar service temporarily unavailable
- Browser blocking external requests

**Solution:**

1. Check internet connection
2. Try regenerating: `npm start`
3. Check browser console for network errors (press F12)
4. Colored initials are the intended fallback (working correctly!)

### Problem: "Avatar missing for specific user"

**Possible causes:**

- User has no Gravatar account (identicon should show)
- User email is invalid/empty in data
- User blocked Gravatar indexing

**Solution:**

- User will see colored initials (correct fallback behavior)
- This is not an error - fallback is working as intended

### Problem: "Wrong avatars for users"

**Causes:**

- Email mismatch (Gravatar uses exact email addresses)
- Email case sensitivity (Gravatar normalizes to lowercase)

**Solution:**

- Verify email addresses in user data
- Gravatar URLs are generated with `toLowerCase().trim()`

### Problem: "Need to update an avatar"

If you change your Gravatar photo, Gravatar's CDN will cache it. To force an update:

1. Update your Gravatar at gravatar.com
2. Clear browser cache (Ctrl+Shift+Delete)
3. Regenerate HTML: `npm start`

## FAQ

**Q: Why not use Google API?**
A: Gravatar is simpler and better:

- No authentication setup required
- Works for any email (not just Google accounts)
- Maintains better privacy (hashes emails)
- No API key management or quota limits
- Free and widely adopted

**Q: What if a user doesn't have Gravatar?**
A: They get a beautiful geometric identicon:

- Unique per email address
- Consistent colors
- Auto-generated, no account needed
- Falls back to colored initials if Gravatar unavailable

**Q: Do I need internet for avatars to display?**
A: Yes, Gravatar requires internet connection. Colored initials always work.

**Q: Can I customize avatar colors?**
A: Yes, edit `src/avatarManager.js` and modify the `MATERIAL_COLORS` array:

```javascript
const MATERIAL_COLORS = [
  '#D32F2F', // Red
  '#F57C00', // Orange
  '#FBC02D', // Yellow
  // ... customize to your preference
];
```

Then regenerate: `npm start`

**Q: Will Gravatar see which emails I'm exporting?**
A: Only email hashes are sent (MD5). Gravatar doesn't see actual addresses unless they have a Gravatar account.

**Q: Can I use a different avatar service?**
A: Yes! The code is modular. You can add other services (UIAvatars, DiceBear, etc.) to `src/avatarManager.js`.

**Q: Why two-tier instead of three-tier?**
A: Simpler is better:

- Gravatar handles both real photos and identicons
- No need for Google API (overcomplicated for this use case)
- Colored initials are automatic fallback
- Result: cleaner code, fewer dependencies, fewer configuration options

## Avatar Color Palette

| Color | Hex Value | Style |
|-------|-----------|-------|
| Red | #D32F2F | Deep red |
| Orange | #F57C00 | Deep orange |
| Yellow | #FBC02D | Lime |
| Green | #689F38 | Light green |
| Green (Dark) | #388E3C | Dark green |
| Blue | #1976D2 | Blue |
| Blue (Dark) | #1565C0 | Dark blue |
| Purple | #7B1FA2 | Deep purple |
| Pink | #C2185B | Deep pink |
| Red-Orange | #E64A19 | Deep orange (variant) |

## Performance

- **Gravatar URL generation:** < 1ms per user
- **Gravatar CDN:** Fast global distribution
- **Network latency:** ~50-200ms per user (during export)
- **Total avatar fetch:** Parallel processing, minimal impact
- **Offline:** Works with cached avatars

## Implementation

### Avatar Manager Functions

**`generateGravatarUrl(email, size=96)`**

- Generates Gravatar URL with MD5 hash
- Returns full URL ready to use (optimized for 56px display with 1.7x Retina scaling)
- `null` if email is empty

**`generateAvatarInitials(name)`**

- Extracts first letters (e.g., "Daniel Miranda" → "DM")
- Returns "?" if name is empty

**`getColorForUser(email)`**

- Returns consistent color based on email hash
- Always returns a valid Material Design color

**`getAvatar(user)`**

- Main function: returns complete avatar object
- Returns: `{name, email, initials, color, avatarUrl}`
- `avatarUrl` is Gravatar URL or null

### Fallback Behavior in HTML

Each avatar image has a fallback:

```html
<img 
  src="https://www.gravatar.com/avatar/HASH?s=96&d=identicon" 
  alt="DM"
  onerror="this.style.display='none'; /* show initials */"
>
```

If image fails to load, CSS shows colored initials instead.

## Resources

- [Gravatar Official Site](https://www.gravatar.com)
- [Gravatar API Docs](https://en.gravatar.com/site/implement/)
- [MD5 Hash Algorithm](https://en.wikipedia.org/wiki/MD5)
- [Material Design Colors](https://material.io/design/color/)
