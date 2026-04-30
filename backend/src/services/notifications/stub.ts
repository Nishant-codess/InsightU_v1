/**
 * Stub notification service
 * Notifications feature is currently disabled
 */

/**
 * Notify students about new note upload (stub)
 */
export async function notifyCourseStudentsAboutNote(
  _teacherId: string,
  _subject: string,
  _noteUrl: string
): Promise<void> {
  // Notifications feature is currently disabled
  // TODO: Implement when notification models are added to schema
  console.log('[notifications] Stub: Would notify students about new note');
}