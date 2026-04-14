/**
 * Build an identity fingerprint from person fields.
 * This is used for speaker resolution matching.
 */
export function buildFingerprint(fields: {
  firstName?: string | null;
  lastName?: string | null;
  employer?: string | null;
  userCurrentRole?: string | null;
  school?: string | null;
  email?: string | null;
}): Record<string, string> {
  const fp: Record<string, string> = {};
  if (fields.firstName) fp.first_name = fields.firstName;
  if (fields.lastName) fp.last_name = fields.lastName;
  if (fields.employer) fp.employer = fields.employer;
  if (fields.userCurrentRole) fp.role = fields.userCurrentRole;
  if (fields.school) fp.school = fields.school;
  if (fields.email) fp.email = fields.email;
  return fp;
}

/**
 * Build display_name in "FirstName LastName — Affiliation" format.
 */
export function buildDisplayName(fields: {
  firstName?: string | null;
  lastName?: string | null;
  employer?: string | null;
  school?: string | null;
  displayName?: string | null;
}): string {
  const name = [fields.firstName, fields.lastName]
    .filter(Boolean)
    .join(" ");

  const context = fields.employer ?? fields.school;

  if (name && context) return `${name} — ${context}`;
  if (name) return name;
  if (fields.displayName) return fields.displayName;
  return "Unknown";
}
