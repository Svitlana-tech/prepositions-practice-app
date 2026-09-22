-- AlterTable
ALTER TABLE "Task" DROP COLUMN "explanationIsLong",
ADD COLUMN     "explanationEntryId" TEXT;

-- CreateTable
CREATE TABLE "ExplanationEntry" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExplanationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExplanationEntry_label_key" ON "ExplanationEntry"("label");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_explanationEntryId_fkey" FOREIGN KEY ("explanationEntryId") REFERENCES "ExplanationEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

