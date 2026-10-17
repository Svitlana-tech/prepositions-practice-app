-- CreateTable
CREATE TABLE "DailyStat" (
    "day" TEXT NOT NULL,
    "testsFinished" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyStat_pkey" PRIMARY KEY ("day")
);
