const TITLES = ['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'smt', 'shri', 'master', 'mast', 'kumari'];

const isTitle = (word) => TITLES.includes(word.replace(/\./g, '').toLowerCase());

/**
 * Get the first given name from a display name, skipping leading honorific
 * titles (Mr., Mrs., Dr., etc.) so e.g. "Mr. Ajay Kumar Saini" -> "Ajay".
 */
export const getFirstName = (displayName) => {
  if (!displayName) return null;
  const parts = displayName.trim().split(/\s+/);
  while (parts.length > 1 && isTitle(parts[0])) {
    parts.shift();
  }
  return parts[0] || null;
};

/**
 * Get a short display name: leading title (if any) + first given name,
 * so e.g. "Mr. Ajay Kumar Saini" -> "Mr. Ajay".
 */
export const getShortDisplayName = (displayName) => {
  if (!displayName) return null;
  const parts = displayName.trim().split(/\s+/);
  const title = parts.length > 1 && isTitle(parts[0]) ? parts[0] : null;
  const firstName = getFirstName(displayName);
  return title ? `${title} ${firstName}` : firstName;
};

/**
 * Get the avatar initial from the first given name (ignoring titles),
 * so e.g. "Mr. Ajay Kumar Saini" -> "A".
 */
export const getFirstNameInitial = (displayName) => {
  const firstName = getFirstName(displayName);
  return firstName ? firstName.charAt(0).toUpperCase() : 'U';
};
