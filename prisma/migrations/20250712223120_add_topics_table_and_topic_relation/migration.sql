/*
  Warnings:

  - Added the required column `topic_id` to the `user_feeds` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user_feeds" ADD COLUMN     "topic_id" UUID NOT NULL;

-- CreateTable
CREATE TABLE "topics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "color" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_topics_user_id" ON "topics"("user_id");

-- CreateIndex
CREATE INDEX "idx_topics_created_at" ON "topics"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "topics_user_id_name_key" ON "topics"("user_id", "name");

-- CreateIndex
CREATE INDEX "idx_user_feeds_topic_id" ON "user_feeds"("topic_id");

-- AddForeignKey
ALTER TABLE "user_feeds" ADD CONSTRAINT "user_feeds_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
