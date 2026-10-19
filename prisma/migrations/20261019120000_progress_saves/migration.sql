-- CreateTable
CREATE TABLE "ProgressSave" (
    "codeHash" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressSave_pkey" PRIMARY KEY ("codeHash")
);
