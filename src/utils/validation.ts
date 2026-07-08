/**
 * Validate an Oracle identifier (table or column name) to prevent SQL injection.
 *
 * Oracle identifier rules: 1–30 chars, must start with a letter, and contain
 * only letters (A-Z), digits (0-9), underscore (_), dollar sign ($), or hash (#).
 *
 * The caller is responsible for uppercasing the value before passing it in.
 *
 * @param identifier - The uppercased Oracle identifier to validate.
 * @returns `true` if the identifier is safe to interpolate into a SQL statement.
 */
export function validateOracleIdentifier(identifier: string): boolean {
  const pattern = /^[A-Z][A-Z0-9_$#]{0,29}$/;
  return pattern.test(identifier);
}
