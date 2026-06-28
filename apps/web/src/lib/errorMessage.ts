// Supabase's PostgrestError (and similar) are plain objects with a `message`
// property, not real Error instances, so `err instanceof Error` misses them
// and a generic fallback hides the actual reason. Check for any object with a
// usable message before giving up.
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}
