-- CreateTable
CREATE TABLE "ProblemReport" (
    "id" TEXT NOT NULL,
    "taskId" TEXT,
    "sentence" TEXT NOT NULL,
    "correctAnswer" TEXT,
    "chosen" TEXT,
    "comment" TEXT NOT NULL,
    "studentName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProblemReport_createdAt_idx" ON "ProblemReport"("createdAt");

-- AddForeignKey
ALTER TABLE "ProblemReport" ADD CONSTRAINT "ProblemReport_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

