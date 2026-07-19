# Configuration Guide

## Environment Variables

All configuration is managed through the `.env` file. Below are all available variables:

### Essential Configuration

#### `OWNER_EMAIL`

**Type:** `string` (email address)  
**Default:** None (required)  
**Description:** The email address of the primary user (you). This identifies whose messages appear on the right side of the chat interface.  
**Example:** `OWNER_EMAIL=Google@gmail.com`

#### `TIMEZONE`

**Type:** `string` (IANA timezone format)  
**Default:** `UTC`  
**Description:** The timezone for displaying message timestamps. Use IANA timezone identifiers.  
**Examples:**

- `America/New_York` - Eastern Time
- `America/Sao_Paulo` - Brazil Time
- `Europe/London` - London Time
- `Asia/Tokyo` - Japan Time
- `UTC` - Coordinated Universal Time

**Find your timezone:** <https://en.wikipedia.org/wiki/List_of_tz_database_time_zones>

#### `LOCALE`

**Type:** `string` (BCP 47 language tag)  
**Default:** `en-US`  
**Description:** The language and region for date/time formatting.  
**Examples:**

- `en-US` - English (United States)
- `pt-BR` - Portuguese (Brazil)
- `de-DE` - German (Germany)
- `fr-FR` - French (France)
- `es-ES` - Spanish (Spain)
- `ja-JP` - Japanese (Japan)

### Data Source Configuration

#### `DATA_SOURCE_PATH`

**Type:** `string` (absolute file path)  
**Default:** `./Groups`  
**Description:** Absolute path to the Google Chat Groups folder containing conversation data.  
**Example:** `/home/user/google-chat-takeout-viewer/Google Chat/Groups`

#### `USER_DATA_PATH`

**Type:** `string` (absolute file path)  
**Default:** `./Users`  
**Description:** Absolute path to the Google Chat Users folder containing user information.  
**Example:** `/home/user/google-chat-takeout-viewer/Google Chat/Users`

### Output Configuration

#### `OUTPUT_DIR`

**Type:** `string` (file path, relative or absolute)  
**Default:** `./output`  
**Description:** Directory where generated HTML files will be saved. Directory is created automatically if it doesn't exist.  
**Examples:**

- `./output` - Output in current directory
- `/home/user/Google-Chat-Takeout-Viewer/output` - Custom absolute path

#### `ENABLE_SEARCH`

**Type:** `boolean` (`true` or `false`)
**Default:** `true`
**Description:** Enables local full-text search for each conversation. When enabled, the exporter creates one self-contained `search.html` page in each conversation folder. Disable it to reduce generated file count, output size, and generation time.
**Examples:**

- `ENABLE_SEARCH=true` - Generate conversation search pages
- `ENABLE_SEARCH=false` - Skip search UI and search pages

---

## Avatar System

The exporter uses **Gravatar** for user avatars. No configuration is needed!

### How Avatars Work

1. **Gravatar Photos** - If a user has a Gravatar account, their profile picture displays
2. **Geometric Identicons** - If no Gravatar exists, a unique geometric pattern displays
3. **Colored Initials** - Fallback if Gravatar is unavailable

### Features

- ✅ **Zero Setup** - Works automatically, no API keys needed
- ✅ **Global** - Works for any email address
- ✅ **Privacy-Friendly** - Only email hashes are sent to Gravatar
- ✅ **Fallback** - Always shows something (initials if needed)

### Getting a Gravatar (Optional)

To add your photo to conversations:

1. Visit [gravatar.com](https://www.gravatar.com)
2. Sign up with your email
3. Upload a profile picture
4. Your Gravatar will appear the next time HTML is exported

### More Information

See [AVATARS.md](AVATARS.md) for technical details about the avatar system.

---

## Sample Configuration Files

### Basic Setup (Local Testing)

```env
OWNER_EMAIL=your.email@gmail.com
TIMEZONE=UTC
LOCALE=en-US
OUTPUT_DIR=./output
DATA_SOURCE_PATH=/path/to/Google/Chat/Groups
USER_DATA_PATH=/path/to/Google/Chat/Users
```

### Brazil Setup

```env
OWNER_EMAIL=seu.email@gmail.com
TIMEZONE=America/Sao_Paulo
LOCALE=pt-BR
OUTPUT_DIR=./output
DATA_SOURCE_PATH=/path/to/Google/Chat/Groups
USER_DATA_PATH=/path/to/Google/Chat/Users
```

---

## Changing Configuration

1. **Edit `.env` file:**

   ```bash
   nano .env
   # or
   vim .env
   ```

2. **Update variables** as needed

3. **Regenerate HTML:**

   ```bash
   npm start
   ```

4. **Open output/index.html** in your browser

---

## Troubleshooting

### Timezone Not Found

**Error:** `Moment Timezone has no data for {timezone}`  
**Solution:** Check timezone spelling. Use IANA format (e.g., `America/Sao_Paulo` not `Sao_Paulo`)

### Locale Not Applied

**Error:** Dates show in English despite locale setting  
**Solution:** Ensure locale is valid BCP 47 tag (e.g., `pt-BR` not `PT-BR`)

### Files Not Generated

**Error:** Output directory is empty  
**Solution:** Check `DATA_SOURCE_PATH` and `USER_DATA_PATH` point to valid Google Chat export folders
