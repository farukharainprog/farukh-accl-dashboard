import { queryAll, queryOne, execute, findUserByEmailOrAlias, getStudentIdAliases } from './db.js';
import { fetchFirestoreSubmissions, upsertFirestoreSubmission } from './firestoreClient.js';

/**
 * Persistence bridge between Cloud Firestore (durable) and SQLite (per-instance).
 *
 * Why this exists: on Vercel the SQLite file lives in /tmp and is re-cloned from
 * the deployed academy.db on every cold instance, so submissions/reviews written
 * only to SQLite vanish on restart/redeploy. The web client already writes every
 * submission and review to Firestore first, so Firestore holds the durable copy.
 *
 * hydrateSubmissionsFromFirestore() pulls any Firestore submissions that this
 * instance's SQLite is missing. It is strictly INSERT-ONLY:
 *  - it never deletes a SQLite row,
 *  - it never overwrites an existing SQLite row (review decisions made locally
 *    are kept; Firestore copies for the same student+task are skipped),
 *  - rows whose student or task cannot be resolved locally are skipped.
 * It is safe to call repeatedly and on every /sync.
 */

let hydrationInFlight: Promise<number> | null = null;

export async function hydrateSubmissionsFromFirestore(): Promise<number> {
  if (hydrationInFlight) return hydrationInFlight;
  hydrationInFlight = (async () => {
    try {
      const fsSubs = await fetchFirestoreSubmissions();
      if (!fsSubs.length) return 0;

      let inserted = 0;
      for (const s of fsSubs) {
        try {
          if (!s || !s.id || !s.task_id) continue;

          // Already present under this exact id?
          if (queryOne('SELECT id FROM submissions WHERE id = ?', String(s.id))) continue;

          // Resolve the student to a local user row (by id, same-person alias, or email)
          let student = queryOne<any>('SELECT id FROM users WHERE id = ?', String(s.student_id || ''));
          if (!student && s.student_id) {
            const aliasHit = getStudentIdAliases(String(s.student_id))
              .map((a) => queryOne<any>('SELECT id FROM users WHERE id = ?', a))
              .find(Boolean);
            student = aliasHit;
          }
          if (!student && s.student_email) {
            student = findUserByEmailOrAlias<any>(String(s.student_email));
          }
          if (!student) continue;

          // A local row for this student+task already exists -> keep it, never overwrite
          const dupe = queryOne(
            'SELECT id FROM submissions WHERE student_id = ? AND task_id = ? LIMIT 1',
            student.id,
            String(s.task_id)
          );
          if (dupe) continue;

          // Task must exist locally (FK)
          if (!queryOne('SELECT id FROM tasks WHERE id = ?', String(s.task_id))) continue;

          execute(
            `
            INSERT OR IGNORE INTO submissions (
              id, student_id, task_id, version, status,
              fb_link, yt_link, li_link, insta_link, other_link,
              file_url, file_name, student_notes, reviewer_id, reviewer_name, reviewer_feedback,
              reviewed_at, submitted_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
            String(s.id),
            student.id,
            String(s.task_id),
            Number(s.version || 1),
            String(s.status || 'submitted'),
            s.fb_link || null,
            s.yt_link || null,
            s.li_link || null,
            s.insta_link || null,
            s.other_link || null,
            s.file_url || null,
            s.file_name || null,
            s.student_notes || null,
            s.reviewer_id || null,
            s.reviewer_name || null,
            s.reviewer_feedback || null,
            s.reviewed_at || null,
            s.submitted_at || new Date().toISOString(),
            s.updated_at || s.submitted_at || new Date().toISOString()
          );
          inserted++;
        } catch {
          // One bad doc must never break hydration of the rest
          continue;
        }
      }

      if (inserted > 0) {
        console.log(`[Hydration] Inserted ${inserted} Firestore submission(s) missing from local SQLite.`);
      }
      return inserted;
    } catch (err) {
      console.warn('[Hydration] Failed (non-fatal):', err);
      return 0;
    } finally {
      hydrationInFlight = null;
    }
  })();
  return hydrationInFlight;
}

/**
 * Write-through: after a submission is created/updated/reviewed in SQLite,
 * mirror the fresh row into Firestore under the SAME id so the durable store
 * and any other server instance converge on one copy. Fire-and-forget:
 * failures are logged by the client helper and never break the API response.
 */
export async function persistSubmissionToFirestore(submissionId: string): Promise<void> {
  try {
    const row = queryOne<any>(
      `
      SELECT s.*, u.full_name as student_name, u.email as student_email,
             u.assigned_teacher_id, u.registered_by_id,
             t.title as task_title, t.day_number as task_day, t.book as task_book, t.category as task_category
      FROM submissions s
      LEFT JOIN users u ON u.id = s.student_id
      LEFT JOIN tasks t ON t.id = s.task_id
      WHERE s.id = ?
    `,
      submissionId
    );
    if (!row) return;

    await upsertFirestoreSubmission({
      id: row.id,
      student_id: row.student_id,
      student_name: row.student_name || 'Student',
      student_email: row.student_email || '',
      assigned_teacher_id: row.assigned_teacher_id ?? null,
      registered_by_id: row.registered_by_id ?? null,
      task_id: row.task_id,
      task_title: row.task_title || 'Task',
      task_day: row.task_day || 1,
      task_book: row.task_book || 'Book 1',
      task_category: row.task_category || 'General',
      version: row.version || 1,
      status: row.status,
      fb_link: row.fb_link || null,
      yt_link: row.yt_link || null,
      li_link: row.li_link || null,
      insta_link: row.insta_link || null,
      other_link: row.other_link || null,
      file_url: row.file_url || null,
      file_name: row.file_name || null,
      student_notes: row.student_notes || null,
      reviewer_id: row.reviewer_id || null,
      reviewer_name: row.reviewer_name || null,
      reviewer_feedback: row.reviewer_feedback || null,
      reviewed_at: row.reviewed_at || null,
      submitted_at: row.submitted_at,
      updated_at: row.updated_at,
    });
  } catch (err) {
    console.warn('[Hydration] persistSubmissionToFirestore failed (non-fatal):', err);
  }
}

export function listLocalSubmissionCount(): number {
  return queryAll<{ id: string }>('SELECT id FROM submissions').length;
}
