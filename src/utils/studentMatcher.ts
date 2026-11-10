export function isSubmissionForStudent(
  sub: any,
  targetStudentId?: string | null,
  targetStudentEmail?: string | null
): boolean {
  if (!sub) return false;
  const sEmail = sub.student_email ? String(sub.student_email).toLowerCase().trim() : '';
  const sId = sub.student_id ? String(sub.student_id).trim() : '';
  const sName = sub.student_name ? String(sub.student_name).toLowerCase().trim() : '';
  const tEmail = targetStudentEmail ? String(targetStudentEmail).toLowerCase().trim() : '';
  const tId = targetStudentId ? String(targetStudentId).trim() : '';

  // 1. Direct ID or Email match
  if (tId && sId === tId) return true;
  if (tEmail && sEmail && sEmail === tEmail) return true;

  // 2. Mateen alias matching (handles both email spellings and legacy IDs)
  const isMateenTarget =
    tEmail === 'mateenbusinesswala@gmail.com' ||
    tEmail === 'mateenbusnesswala@gmail.com' ||
    tId === '0e5e0061-f2ac-4ff6-8085-4d6d575938b9' ||
    tId === 'std_1793115797698_qvwb';

  const isMateenSub =
    sEmail === 'mateenbusinesswala@gmail.com' ||
    sEmail === 'mateenbusnesswala@gmail.com' ||
    sId === '0e5e0061-f2ac-4ff6-8085-4d6d575938b9' ||
    sId === 'std_1793115797698_qvwb' ||
    sName.includes('mateen');

  if (isMateenTarget && isMateenSub) return true;

  // 3. Farukh Student alias matching
  const isFarukhStudentTarget =
    tEmail === 'farukharain52@gmail.com' ||
    tId === 'std_1793115679818_1ndy' ||
    tId === 'student';

  const isFarukhStudentSub =
    sEmail === 'farukharain52@gmail.com' ||
    sId === 'student' ||
    sId === 'std_1793115679818_1ndy' ||
    (sName === 'student' && !sEmail);

  if (isFarukhStudentTarget && isFarukhStudentSub) return true;

  // 4. Rukhsar alias matching
  const isRukhsarTarget =
    tEmail === 'rukhsarbusinesswali@gmail.com' ||
    tId === 'std_1793116071954_ltmd';

  const isRukhsarSub =
    sEmail === 'rukhsarbusinesswali@gmail.com' ||
    sId === 'std_1793116071954_ltmd' ||
    sName.includes('rukhsar');

  if (isRukhsarTarget && isRukhsarSub) return true;

  // 5. Mehak alias matching
  const isMehakTarget =
    tEmail === 'mehakupworkwali@gmail.com' ||
    tId === 'std_1793116124898_n4wn';

  const isMehakSub =
    sEmail === 'mehakupworkwali@gmail.com' ||
    sId === 'std_1793116124898_n4wn' ||
    sName.includes('mehak');

  if (isMehakTarget && isMehakSub) return true;

  return false;
}
