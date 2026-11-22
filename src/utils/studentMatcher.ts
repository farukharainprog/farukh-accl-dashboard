/**
 * Decides whether a submission belongs to a given student.
 *
 * FIXED VERSION — read this before changing:
 * The old matcher treated a submission as a student's if the student_name
 * merely CONTAINED 'mateen' / 'rukhsar' / 'mehak', and it treated the demo
 * account id 'student' and a real person's test account as the same person.
 * Combined with firestoreService.saveSubmission() reusing the first "matching"
 * doc, that meant: when one student submitted a task, a second student
 * submitting the same task either got the error "This task is already Approved
 * and completed!" or silently overwrote the first student's submission.
 *
 * Rules now:
 *  1. Exact student_id match, or exact email match (case-insensitive).
 *  2. ONE same-person legacy exception: a single student historically held two
 *     ids (an older Firestore-era id and his current id); his submissions are
 *     stored under the current id while an older profile may carry the legacy
 *     id. Both ids belong to the SAME person, so this can never mix two
 *     different students.
 * Name-based matching is intentionally gone: names are display text, not
 * identity, and two accounts must never share a submission slot.
 */

// The same person's two historical ids (legacy Firestore-era id + current id).
const SAME_PERSON_ID_PAIR = [
  '0e5e0061-f2ac-4ff6-8085-4d6d575938b9',
  'std_1793115797698_qvwb',
];

function isSamePersonIdPair(a: string, b: string): boolean {
  return a !== b && SAME_PERSON_ID_PAIR.includes(a) && SAME_PERSON_ID_PAIR.includes(b);
}

export function isSubmissionForStudent(
  sub: any,
  targetStudentId?: string | null,
  targetStudentEmail?: string | null
): boolean {
  if (!sub) return false;
  const sEmail = sub.student_email ? String(sub.student_email).toLowerCase().trim() : '';
  const sId = sub.student_id ? String(sub.student_id).trim() : '';
  const tEmail = targetStudentEmail ? String(targetStudentEmail).toLowerCase().trim() : '';
  const tId = targetStudentId ? String(targetStudentId).trim() : '';

  // 1. Direct ID or Email match (the only general rule)
  if (tId && sId && sId === tId) return true;
  if (tEmail && sEmail && sEmail === tEmail) return true;

  // 2. Same-person legacy id pair (see header comment)
  if (tId && sId && isSamePersonIdPair(sId, tId)) return true;

  return false;
}
