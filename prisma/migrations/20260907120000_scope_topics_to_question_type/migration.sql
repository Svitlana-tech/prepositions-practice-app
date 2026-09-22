-- Topics used to be one global list. They now belong to a single question type:
-- every existing topic was a grammar topic for "missing word in a sentence".

-- DropIndex
DROP INDEX "Category_name_key";

-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "taskType" "TaskType";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "taskType" "TaskType" NOT NULL DEFAULT 'SENTENCE_MCQ';

-- CreateIndex
CREATE UNIQUE INDEX "Category_taskType_name_key" ON "Category"("taskType", "name");

-- Backfill: every practice session so far was a sentence-MCQ session.
UPDATE "Attempt" SET "taskType" = 'SENTENCE_MCQ' WHERE "taskType" IS NULL;
