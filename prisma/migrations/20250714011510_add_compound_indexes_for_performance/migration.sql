-- CreateIndex
CREATE INDEX "idx_feed_items_feed_published" ON "feed_items"("feed_id", "published_at" DESC);

-- CreateIndex
CREATE INDEX "idx_feed_items_feed_created" ON "feed_items"("feed_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_user_feeds_user_active_topic" ON "user_feeds"("user_id", "is_active", "topic_id");

-- CreateIndex
CREATE INDEX "idx_user_feeds_user_active" ON "user_feeds"("user_id", "is_active");
