# Google Chat Takeout HTML Exporter

Convert Google Chat JSON exports into beautiful, interactive Material Design 3 HTML chat interfaces. View your conversations in a modern web browser with full timezone and locale support.

## Features

✨ **Material Design 3 UI** - Modern, responsive interface using Material Design components  
💬 **Chat Conversation Format** - Messages displayed in a familiar chat bubble layout  
🎨 **Smart Avatars** - Gravatar avatars with fallback to colored initials  
🔗 **Rich URL Previews** - Display metadata, thumbnails, and titles for shared links  
🌍 **Timezone & Locale Support** - Format dates/times for any timezone and language  
📱 **Responsive Design** - Works on desktop, tablet, and mobile devices  
🌙 **Dark Mode** - Toggle between light and dark themes with persistent preference  
📊 **Conversation Index** - Master index page listing all conversations with preview  
🖼️ **Inline Media Support** - Display images, videos, and download links  
⚡ **Fast Generation** - Process thousands of messages in seconds  

## 👀 See It In Action

Want to see what the exporter output looks like? Open [DEMO](http://www.danielmiranda.dev/google-chat-takeout-html-exporter/) in your browser for an interactive preview with sample messages, attachments, pagination, and dark mode.

## Quick Start

### Prerequisites

- **Node.js** 20 LTS or higher
- **Google Chat JSON export** (from Takeout)
- **npm** (included with Node.js)

### Installation

1. **Clone or download** this project

   ```bash
   cd google-chat-takeout-html-exporter
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure .env file**

   ```bash
   cp .env.example .env
   nano .env
   ```

   Set at minimum:
   - `OWNER_EMAIL` - Your email address
   - `DATA_SOURCE_PATH` - Path to Google Chat Groups folder
   - `USER_DATA_PATH` - Path to Google Chat Users folder

   See [CONFIG.md](CONFIG.md) for detailed configuration options.

4. **Generate HTML**

   ```bash
   npm start
   ```

5. **View results**

   ```bash
   # Open in browser
   open output/index.html
   # or
   firefox output/index.html
   ```

## Configuration

See [CONFIG.md](CONFIG.md) for:

- All environment variables
- Timezone and locale options
- Sample configurations
- Troubleshooting

### Quick Configuration Examples

**Brazil (Portuguese, São Paulo Time):**

```env
OWNER_EMAIL=seu.email@gmail.com
TIMEZONE=America/Sao_Paulo
LOCALE=pt-BR
```

**US (English, Eastern Time):**

```env
OWNER_EMAIL=your.email@gmail.com
TIMEZONE=America/New_York
LOCALE=en-US
```

## i18n Resource

The exporter uses a locale-based translation resource for generated HTML UI text.

- Source file: `src/i18n.js`
- Locale input: `LOCALE` from `.env`
- Fallback behavior: defaults to English if a locale or key is missing

### How locale resolution works

1. Tries exact locale key (example: `pt-BR`)
2. Tries base language key (example: `pt` from `pt-PT`)
3. Falls back to `en`

### What is translated

- Index page labels (title, subtitle, stats)
- Conversation page labels (footer, empty states)
- Pagination labels (page indicator, Previous/Next, First/Last)
- Generic fallback text (Unknown, Group Chat, No members)
- Theme button titles

### Current resources

- `en` (default)
- `pt-BR`

### Add a new locale

1. Open `src/i18n.js`
2. Add a new locale object under `resources`
3. Reuse the same translation keys used by `en`
4. Set `LOCALE` in `.env` (example: `LOCALE=es-ES`)
5. Run `npm start` to regenerate output

If some keys are not translated in the new locale, English values are used automatically.

## Known Issues

See [BUG.md](BUG.md) for a documented Google Takeout metadata bug that can affect attachment filenames in `messages.json`.

## How to Export Google Chat Data

1. Go to [Google Takeout](https://takeout.google.com/)
2. Deselect all products
3. Select **Google Chat**
4. Download as ZIP
5. Extract the ZIP file
6. In the exported folder, find `Chats/Groups` - this is your `DATA_SOURCE_PATH`
7. In the exported folder, find `Chats/Users` - this is your `USER_DATA_PATH`

## Project Structure

```text
google-chat-takeout-viewer/
├── src/
│   ├── avatarManager.js      # User avatar handling
│   ├── dateFormatter.js      # Timezone/locale formatting
│   ├── index.js              # Main entry point
│   ├── parser.js             # JSON parsing logic
│   ├── renderer.js           # HTML generation
│   └── utils.js              # Helper utilities
├── output/                   # Generated HTML files (created after running)
│   ├── index.html            # Master conversation list
│   ├── DM */                 # Individual conversation pages
│   └── Space */              # Group space pages
├── package.json              # Dependencies
├── .env                      # Configuration (keep secret!)
├── .gitignore                # Git ignore rules
├── AVATARS.md                # Explains how avatars work
├── BUG.md                    # Known Google Takeout Bug
├── CONFIG.md                 # Configuration documentation
└── README.md                 # This file
```

## Output Format

### index.html

Master page listing all conversations with:

- Conversation count statistics
- Participant avatar and name
- Last message preview
- Message count per conversation
- Links to individual conversation pages

### Individual Conversation Pages (DM *.html)

Each conversation includes:

- **Header** - Receiver profile (avatar, name, email) with back link
- **Messages** - Chronological message bubbles
  - **Owner messages** - Right-aligned, light blue background
  - **Receiver messages** - Left-aligned, light gray background
  - **Timestamps** - Formatted per configured timezone/locale
- **URL Previews** - Rich metadata cards with title, snippet, thumbnail
- **Responsive Design** - Optimized for mobile, tablet, desktop
- **Footer** - Export info and timezone/locale details

## Usage Examples

### Change Timezone

Edit `.env`:

```env
TIMEZONE=Europe/London
```

Then regenerate:

```bash
npm start
```

### Change Language

Edit `.env`:

```env
LOCALE=de-DE
```

Then regenerate:

```bash
npm start
```

### Use Custom Output Directory

Edit `.env`:

```bash
OUTPUT_DIR=/var/www/chat-export
```

Then regenerate:

```bash
npm start
```

## Development

### Run in Watch Mode

Automatically regenerate when source files change:

```bash
npm run dev
```

### Project Scripts

```bash
npm start     # Generate HTML once
npm run dev   # Watch mode - regenerate on changes
```

## Architecture

### Modules

**parser.js**

- Reads Google Chat JSON exports
- Parses user info, conversations, messages
- Handles missing/malformed data gracefully

**renderer.js**

- Generates Material Design 3 HTML
- Renders individual conversation pages
- Renders master index page
- Handles message formatting and annotations

**dateFormatter.js**

- Parses Google Chat timestamp format
- Converts to configured timezone
- Formats dates per locale

**avatarManager.js**

- Generates Gravatar URLs using MD5 email hashing
- Extracts user initials from names for fallback display
- Creates consistent color palette per email address
- Returns complete avatar objects with all display information

**utils.js**

- URL extraction and validation
- HTML sanitization (XSS prevention)
- File type detection
- Annotation metadata extraction

## Troubleshooting

### "No conversations found"

- Check `DATA_SOURCE_PATH` points to valid Groups folder
- Verify JSON files exist in the path

### "Could not identify owner"

- Check `USER_DATA_PATH` points to valid Users folder
- Verify `OWNER_EMAIL` matches an email in user data

### Timezone not working

- Use IANA format: `America/Sao_Paulo` not `Sao_Paulo`
- See [Valid Timezones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

### HTML file is too large

- Large conversations with many messages create large HTML files
- This is normal - each message is self-contained in the HTML
- Files compress well with GZIP

### Avatar colors are wrong

- Colors are generated consistently from email hash
- Same email always gets same color across all exports
- If you see only colored initials instead of Gravatar photos, check internet connection
- Gravatar automatically falls back to geometric identicons for emails without accounts

## Avatar System

The exporter automatically displays avatars using **Gravatar**:

- **Real Gravatar photos** for users with accounts
- **Unique geometric identicons** for all other emails (no account needed)
- **Colored initials** as fallback if Gravatar is unavailable

**No configuration needed!** Just run `npm start` and avatars will display automatically.

### How It Works

```text
User Avatar Request
    ↓
Try Gravatar → Success: Display Gravatar avatar or identicon
    ↓
Fallback: Display colored initials (always available)
```

**Privacy & Security:**

- ✅ No user consent required
- ✅ Only email hashes sent to Gravatar (not addresses)
- ✅ No authentication needed
- ✅ Works for any email worldwide

## Performance

- **Parsing:** 49 conversations with 613,385 total messages
- **Rendering:** 1,263 HTML files generated from the latest build
- **Output size:** ~189 MB in `output/` (HTML only, attachments are not copied)
- **Attachment strategy:** Media files are referenced directly from `DATA_SOURCE_PATH`, which avoids duplication and speeds up export writes
- **Avatar fetching:** Concurrent (minimal impact on export generation)

## Limitations

- No real-time updates (static HTML export)
- Avatars require internet connection to display
- URL previews depend on metadata in export data

## Browser Support

Works in all modern browsers:

- ✅ Chrome/Chromium (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ⚠️ IE11 (not supported)

## Security

- ✅ All HTML is static (no server required)
- ✅ Can be hosted on any web server
- ⚠️ `.env` file contains API keys - never commit to Git
- ✅ `.gitignore` configured to exclude sensitive files

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:

1. Check [CONFIG.md](CONFIG.md) for configuration help
2. Check error messages in console output
3. Verify `.env` configuration is correct

## Future Enhancements

Potential improvements:

- [ ] Search/filter conversations
- [ ] Full-text message search
- [ ] Export to PDF
- [ ] Conversation statistics (word count, message frequency)
- [ ] User mention highlighting
- [ ] React/Vue.js interactive version
- [ ] SQLite database export

## Contributors

- **Daniel Miranda** - [![GitHub](https://img.shields.io/badge/GitHub-dmirandaa-181717?style=flat&logo=github)](https://github.com/dmirandaa)

---

**Made with ❤️ using Node.js and Material Design 3**
