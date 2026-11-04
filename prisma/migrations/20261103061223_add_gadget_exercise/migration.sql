-- AlterTable
ALTER TABLE "SleepRecord" ADD COLUMN     "didExercise" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "usedGadget" BOOLEAN NOT NULL DEFAULT false;
