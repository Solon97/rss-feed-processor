/*
  Warnings:

  - Added the required column `feed_type` to the `feeds` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FeedType" AS ENUM ('youtube', 'rss');

-- AlterTable
ALTER TABLE "feeds" ADD COLUMN     "feed_type" "FeedType" NOT NULL;

-- CreateIndex
CREATE INDEX "idx_feeds_feed_type" ON "feeds"("feed_type");
