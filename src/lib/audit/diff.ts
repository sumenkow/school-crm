import { AuditChangedFields } from './types';
import { redactSensitiveData, isSensitiveKey, REDACTED_PLACEHOLDER } from './redaction';

/**
 * Calculates a concise diff of changed fields between two object states.
 * Guarantees that secrets in the diff are properly redacted.
 */
export function calculateChangedFields(
  before: Record<string, any> | null | undefined,
  after: Record<string, any> | null | undefined
): AuditChangedFields | null {
  if (!before && !after) {
    return null;
  }

  const diff: AuditChangedFields = {};

  // Case 1: Creation (before is empty)
  if (!before && after) {
    for (const [key, value] of Object.entries(after)) {
      diff[key] = {
        old: null,
        new: isSensitiveKey(key) ? REDACTED_PLACEHOLDER : redactSensitiveData(value),
      };
    }
    return Object.keys(diff).length > 0 ? diff : null;
  }

  // Case 2: Deletion (after is empty)
  if (before && !after) {
    for (const [key, value] of Object.entries(before)) {
      diff[key] = {
        old: isSensitiveKey(key) ? REDACTED_PLACEHOLDER : redactSensitiveData(value),
        new: null,
      };
    }
    return Object.keys(diff).length > 0 ? diff : null;
  }

  // Case 3: Update (both exist)
  const allKeys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);

  for (const key of allKeys) {
    const rawBefore = before ? before[key] : undefined;
    const rawAfter = after ? after[key] : undefined;

    // Compare raw values to detect whether a change actually occurred
    const serializedBefore = JSON.stringify(rawBefore);
    const serializedAfter = JSON.stringify(rawAfter);

    if (serializedBefore !== serializedAfter) {
      const valBefore =
        rawBefore !== undefined
          ? isSensitiveKey(key)
            ? REDACTED_PLACEHOLDER
            : redactSensitiveData(rawBefore)
          : null;
      const valAfter =
        rawAfter !== undefined
          ? isSensitiveKey(key)
            ? REDACTED_PLACEHOLDER
            : redactSensitiveData(rawAfter)
          : null;

      diff[key] = {
        old: valBefore,
        new: valAfter,
      };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
}
