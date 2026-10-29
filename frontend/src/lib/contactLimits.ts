/**
 * Contact form length caps, shared by the form (ContactApp maxLength) and the
 * /api/contact route, so the server rejects exactly what the client prevents.
 * Generous, but they stop a pasted novel.
 */
export const CONTACT_MAX_LEN = {
  name: 100,
  email: 254,
  company: 100,
  subject: 150,
  message: 5000,
} as const;

export type ContactField = keyof typeof CONTACT_MAX_LEN;
