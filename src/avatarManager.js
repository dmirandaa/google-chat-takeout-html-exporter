// Avatar Manager module - handles user avatar generation with Gravatar
import crypto from 'crypto';

const MATERIAL_COLORS = [
  '#D32F2F', '#F57C00', '#FBC02D', '#689F38', '#388E3C',
  '#1976D2', '#1565C0', '#7B1FA2', '#C2185B', '#E64A19'
];

export function generateAvatarInitials(name) {
  if (!name) return '?';

  // Extract initials from name
  const parts = name.trim().split(/\s+/).filter(p => p.length > 0);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();

  // Use first letter of first and last name
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getColorForUser(email) {
  if (!email) return MATERIAL_COLORS[0];

  // Generate consistent color per user email using hash
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(i);
    hash = hash & hash;  // Convert to 32-bit integer
  }

  const index = Math.abs(hash) % MATERIAL_COLORS.length;
  return MATERIAL_COLORS[index];
}

export function generateGravatarUrl(email, size = 96) {
  // Gravatar is a free service that requires no authentication
  // It generates avatars based on email hash
  if (!email) return null;

  try {
    // Normalize email: lowercase and trim
    const normalizedEmail = email.toLowerCase().trim();

    // Generate MD5 hash of email
    const hash = crypto.createHash('md5').update(normalizedEmail).digest('hex');

    // Return Gravatar URL with default avatar (identicon style)
    // d=identicon: fallback to geometric identicon if no Gravatar exists
    // Size 96px is optimized for 56px display (1.7x scale for Retina displays)
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
  } catch (error) {
    return null;
  }
}

export async function getAvatar(user) {
  if (!user) {
    return {
      initials: '?',
      color: MATERIAL_COLORS[0],
      avatarUrl: null
    };
  }

  // Use Gravatar for avatar (works for any email)
  const avatarUrl = generateGravatarUrl(user.email);

  return {
    name: user.name || 'Unknown',
    email: user.email || 'unknown@example.com',
    initials: generateAvatarInitials(user.name),
    color: getColorForUser(user.email),
    avatarUrl
  };
}
