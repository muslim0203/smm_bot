ALTER TABLE "social_projects"
ADD COLUMN "telegram_channel_id" TEXT,
ADD COLUMN "telegram_channel_title" TEXT,
ADD COLUMN "telegram_publish_enabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "social_content_drafts"
ADD COLUMN "telegram_message_id" TEXT,
ADD COLUMN "telegram_posted_at" TIMESTAMP(3);
