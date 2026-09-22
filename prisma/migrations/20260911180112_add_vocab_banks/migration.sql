-- CreateTable
CREATE TABLE "VocabBank" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabWord" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "ukrainian" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabWord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VocabWord_bankId_idx" ON "VocabWord"("bankId");

-- AddForeignKey
ALTER TABLE "VocabWord" ADD CONSTRAINT "VocabWord_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "VocabBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;
