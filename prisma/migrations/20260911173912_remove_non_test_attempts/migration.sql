-- Self-check practice attempts are no longer saved (see PracticeSession) and the
-- general Student Results page was removed, since a teacher only reviews results
-- through a specific Test now. Drop the old, now-unreadable practice attempts;
-- test attempts (testId IS NOT NULL) are untouched.
DELETE FROM "Attempt" WHERE "testId" IS NULL;
