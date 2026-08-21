ALTER TABLE "instagram_inbox_events"
ADD COLUMN "parent_id" TEXT,
ADD COLUMN "reply_object_id" TEXT;

CREATE INDEX "instagram_inbox_events_account_id_object_id_idx"
ON "instagram_inbox_events"("account_id", "object_id");

CREATE INDEX "instagram_inbox_events_reply_object_id_idx"
ON "instagram_inbox_events"("reply_object_id");

ALTER TABLE "social_projects"
ADD COLUMN "content_themes" TEXT;

ALTER TABLE "social_content_drafts"
ADD COLUMN "pillar" TEXT;
