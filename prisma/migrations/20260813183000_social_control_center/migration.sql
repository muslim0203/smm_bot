CREATE TABLE "social_projects" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brand_voice" TEXT NOT NULL DEFAULT 'Samimiy, aniq va professional',
    "brand_facts" TEXT NOT NULL,
    "website_url" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent',
    "content_enabled" BOOLEAN NOT NULL DEFAULT false,
    "content_approval_required" BOOLEAN NOT NULL DEFAULT true,
    "auto_publish_enabled" BOOLEAN NOT NULL DEFAULT false,
    "daily_content_hour" INTEGER NOT NULL DEFAULT 9,
    "daily_content_minute" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "social_projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instagram_accounts" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "username" TEXT,
    "instagram_user_id" TEXT NOT NULL,
    "access_token_encrypted" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3),
    "token_warning_sent_at" TIMESTAMP(3),
    "dm_replies_enabled" BOOLEAN NOT NULL DEFAULT true,
    "comment_replies_enabled" BOOLEAN NOT NULL DEFAULT true,
    "publishing_enabled" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_webhook_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "instagram_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_content_drafts" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "instagram_account_id" TEXT,
    "content_date" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GENERATING',
    "format" TEXT NOT NULL DEFAULT 'FEED',
    "topic" TEXT,
    "hook" TEXT,
    "script" TEXT,
    "caption" TEXT,
    "image_prompt" TEXT,
    "image_url" TEXT,
    "image_object_key" TEXT,
    "scheduled_for" TIMESTAMP(3),
    "approved_by_telegram_user_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "instagram_container_id" TEXT,
    "instagram_media_id" TEXT,
    "published_at" TIMESTAMP(3),
    "last_error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "social_content_drafts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "telegram_social_sessions" (
    "id" TEXT NOT NULL,
    "telegram_user_id" TEXT NOT NULL,
    "selected_project_id" TEXT,
    "pending_action" TEXT,
    "pending_entity_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "telegram_social_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instagram_oauth_states" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "telegram_user_id" TEXT NOT NULL,
    "state_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "instagram_oauth_states_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "instagram_inbox_events" ADD COLUMN "account_id" TEXT;

CREATE UNIQUE INDEX "social_projects_key_key" ON "social_projects"("key");
CREATE UNIQUE INDEX "instagram_accounts_instagram_user_id_key" ON "instagram_accounts"("instagram_user_id");
CREATE INDEX "instagram_accounts_project_id_is_active_idx" ON "instagram_accounts"("project_id", "is_active");
CREATE UNIQUE INDEX "social_content_drafts_project_id_content_date_key" ON "social_content_drafts"("project_id", "content_date");
CREATE INDEX "social_content_drafts_status_scheduled_for_idx" ON "social_content_drafts"("status", "scheduled_for");
CREATE INDEX "social_content_drafts_instagram_account_id_status_idx" ON "social_content_drafts"("instagram_account_id", "status");
CREATE UNIQUE INDEX "telegram_social_sessions_telegram_user_id_key" ON "telegram_social_sessions"("telegram_user_id");
CREATE UNIQUE INDEX "instagram_oauth_states_state_hash_key" ON "instagram_oauth_states"("state_hash");
CREATE INDEX "instagram_oauth_states_expires_at_used_at_idx" ON "instagram_oauth_states"("expires_at", "used_at");
CREATE INDEX "instagram_inbox_events_account_id_status_created_at_idx" ON "instagram_inbox_events"("account_id", "status", "created_at");

ALTER TABLE "instagram_accounts" ADD CONSTRAINT "instagram_accounts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "social_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instagram_inbox_events" ADD CONSTRAINT "instagram_inbox_events_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "instagram_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "social_content_drafts" ADD CONSTRAINT "social_content_drafts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "social_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_content_drafts" ADD CONSTRAINT "social_content_drafts_instagram_account_id_fkey" FOREIGN KEY ("instagram_account_id") REFERENCES "instagram_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "telegram_social_sessions" ADD CONSTRAINT "telegram_social_sessions_selected_project_id_fkey" FOREIGN KEY ("selected_project_id") REFERENCES "social_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "instagram_oauth_states" ADD CONSTRAINT "instagram_oauth_states_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "social_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
