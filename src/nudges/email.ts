export type NudgeEmail = { to: string; subject: string; body: string };

/**
 * Placeholder seam — no email provider is integrated yet (US-020 depends on
 * whatever transactional-email path US-009's email capture feature
 * introduces; do not add a second provider here). Wire this to the real
 * sender once that decision is made.
 */
export async function sendEmail(email: NudgeEmail): Promise<void> {
  console.log('[nudges] would send email', email);
  await Promise.resolve();
}
