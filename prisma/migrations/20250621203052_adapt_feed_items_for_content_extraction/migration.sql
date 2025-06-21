-- CreateTable
CREATE TABLE "feed_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "feed_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "content" TEXT,
    "thumbnail" TEXT,
    "published_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feeds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "status" TEXT DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "last_fetched_at" TIMESTAMPTZ(6),

    CONSTRAINT "feeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_feeds" (
    "user_id" UUID NOT NULL,
    "feed_id" UUID NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "access_permissions" TEXT DEFAULT 'read',
    "last_viewed_at" TIMESTAMPTZ(6),
    "notification_enabled" BOOLEAN DEFAULT true,
    "notification_frequency" TEXT DEFAULT 'immediate',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_feeds_pkey" PRIMARY KEY ("user_id","feed_id")
);

-- CreateIndex
CREATE INDEX "idx_feed_items_created_at" ON "feed_items"("created_at");

-- CreateIndex
CREATE INDEX "idx_feed_items_feed_id" ON "feed_items"("feed_id");

-- CreateIndex
CREATE INDEX "idx_feed_items_published_at" ON "feed_items"("published_at");

-- CreateIndex
CREATE UNIQUE INDEX "feed_items_feed_id_url_key" ON "feed_items"("feed_id", "url");

-- CreateIndex
CREATE UNIQUE INDEX "feeds_url_key" ON "feeds"("url");

-- CreateIndex
CREATE INDEX "idx_feeds_created_at" ON "feeds"("created_at");

-- CreateIndex
CREATE INDEX "idx_feeds_is_active" ON "feeds"("is_active");

-- CreateIndex
CREATE INDEX "idx_feeds_status" ON "feeds"("status");

-- CreateIndex
CREATE INDEX "idx_feeds_url" ON "feeds"("url");

-- CreateIndex
CREATE INDEX "idx_user_feeds_created_at" ON "user_feeds"("created_at");

-- CreateIndex
CREATE INDEX "idx_user_feeds_feed_id" ON "user_feeds"("feed_id");

-- CreateIndex
CREATE INDEX "idx_user_feeds_is_active" ON "user_feeds"("is_active");

-- CreateIndex
CREATE INDEX "idx_user_feeds_last_viewed_at" ON "user_feeds"("last_viewed_at");

-- CreateIndex
CREATE INDEX "idx_user_feeds_user_id" ON "user_feeds"("user_id");

-- AddForeignKey
ALTER TABLE "feed_items" ADD CONSTRAINT "feed_items_feed_id_fkey" FOREIGN KEY ("feed_id") REFERENCES "feeds"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_feeds" ADD CONSTRAINT "user_feeds_feed_id_fkey" FOREIGN KEY ("feed_id") REFERENCES "feeds"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
