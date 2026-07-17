// Utility functions - helpers for URL parsing, file type detection, HTML sanitization

export function extractLinks(text) {
  // Find URLs in message text
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s<>"'\)\]]+)/g;
  return text.match(urlRegex) || [];
}

export function extractAnnotationsMetadata(annotations) {
  // Extract rich metadata from message annotations
  if (!annotations || !Array.isArray(annotations)) return [];

  return annotations
    .filter(ann => ann.url_metadata)
    .map(ann => ({
      startIndex: ann.start_index,
      length: ann.length,
      title: ann.url_metadata.title || '',
      snippet: ann.url_metadata.snippet || '',
      imageUrl: ann.url_metadata.image_url || null,
      url: ann.url_metadata.url?.private_do_not_access_or_else_safe_url_wrapped_value || ''
    }));
}

export function detectFileType(url) {
  // Determine file type from URL extension
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const extension = pathname.split('.').pop().toLowerCase();
    return extension || null;
  } catch (e) {
    return null;
  }
}

export function sanitizeHtml(text) {
  // Escape HTML special characters to prevent XSS
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

export function getFileIcon(mimeType) {
  // Map MIME type or extension to Material Design icon name
  if (!mimeType) return 'attach_file';

  const extension = mimeType.toLowerCase();
  const iconMap = {
    'pdf': 'description',
    'doc': 'description',
    'docx': 'description',
    'txt': 'description',
    'xls': 'table_chart',
    'xlsx': 'table_chart',
    'csv': 'table_chart',
    'ppt': 'slideshow',
    'pptx': 'slideshow',
    'zip': 'folder_zip',
    'rar': 'folder_zip',
    '7z': 'folder_zip',
    'jpg': 'image',
    'jpeg': 'image',
    'png': 'image',
    'gif': 'image',
    'webp': 'image',
    'svg': 'image',
    'mp4': 'videocam',
    'avi': 'videocam',
    'mkv': 'videocam',
    'mov': 'videocam',
    'mp3': 'audio_file',
    'wav': 'audio_file',
    'flac': 'audio_file',
    'm4a': 'audio_file'
  };
  return iconMap[extension] || 'attach_file';
}

export function truncateString(str, length = 100) {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function isImageUrl(url) {
  // Check if URL points to an image
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  const ext = detectFileType(url);
  return ext ? imageExtensions.includes(ext) : false;
}

export function extractDomain(url) {
  // Extract domain from URL
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (e) {
    return url;
  }
}

export function isValidUrl(string) {
  // Check if string is a valid URL
  try {
    new URL(string);
    return true;
  } catch (e) {
    return false;
  }
}

export function getFileExtension(filename) {
  // Extract file extension from filename
  if (!filename) return '';
  return filename.split('.').pop().toLowerCase();
}

export function isImageFile(filename) {
  // Check if filename is an image
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  const ext = getFileExtension(filename);
  return ext ? imageExtensions.includes(ext) : false;
}

export function isVideoFile(filename) {
  // Check if filename is a video
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v', '3gp'];
  const ext = getFileExtension(filename);
  return ext ? videoExtensions.includes(ext) : false;
}

export function isAudioFile(filename) {
  // Check if filename is an audio file
  const audioExtensions = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'wma', 'opus'];
  const ext = getFileExtension(filename);
  return ext ? audioExtensions.includes(ext) : false;
}
