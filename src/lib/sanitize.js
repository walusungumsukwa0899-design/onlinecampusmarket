/**
 * Strips HTML tags and dangerous patterns from user-provided text.
 * Used before rendering vendor descriptions and any user content.
 */
export function sanitizeText(str) {
  if (!str || typeof str !== 'string') return ''
  return str
    .replace(/<[^>]*>/g, '')           // strip HTML tags
    .replace(/javascript:/gi, '')       // strip js: URIs
    .replace(/on\w+\s*=/gi, '')         // strip event handlers
    .replace(/data:/gi, '')             // strip data: URIs
    .trim()
}

/** Same as sanitizeText but preserves newlines as <br> */
export function sanitizeAndPreserveLines(str) {
  return sanitizeText(str).replace(/\n/g, '<br>')
}
