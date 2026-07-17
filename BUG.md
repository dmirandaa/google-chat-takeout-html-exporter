# Known Google Takeout Bug

Google Takeout can export attachments that originally have the same name in the same conversation using different files on disk, but the `messages.json` metadata does not always reflect those exported filenames correctly.

## What happens

- Two or more attachments can appear to belong to the same conversation item.
- The exported files on disk may have distinct names.
- In `messages.json`, `original_name` and `export_name` can still look duplicated or stale.

## Impact

- The exporter may render attachments in the order and names provided by Google Takeout.
- When Takeout metadata is inconsistent, the app cannot reliably infer the true exported filename from `messages.json` alone.

## Status

- This is a source-data issue from Google Takeout.
- There is no safe fix in the exporter without guessing filenames.
- If this appears in generated HTML, the output is reflecting the Takeout metadata as exported.

## Fix

- If and when Google fixes this bug, the exporter will correctly render all attachment files.

## Example

```json
{
  "creator": {
    "name": "Daniel",
    "email": "daniel@gmail.com",
    "user_type": "Human"
  },
  "created_date": "Tuesday, April 19, 2016 at 12:09:49 AM UTC",
  "attached_files": [
    {
      "original_name": "2016-04-18.jpg",
      "export_name": "File-2016-04-18.jpg" // File on disk is File-2016-04-18.jpg
    }
  ],
  "topic_id": "O9uV-I_z02Y",
  "message_id": "6RwUZgAAAAE/O9uV-I_z02Y/O9uV-I_z02Y"
},
{
  "creator": {
    "name": "Daniel",
    "email": "daniel@gmail.com",
    "user_type": "Human"
  },
  "created_date": "Tuesday, April 19, 2016 at 12:09:53 AM UTC",
  "attached_files": [
    {
      "original_name": "2016-04-18.jpg",
      "export_name": "File-2016-04-18.jpg" // File on disk is File-2016-04-18(1).jpg
    }
  ],
  "topic_id": "omz0K769Wg4",
  "message_id": "6RwUZgAAAAE/omz0K769Wg4/omz0K769Wg4"
}
```
