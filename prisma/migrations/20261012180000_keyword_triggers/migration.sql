CREATE TABLE "instagram_keyword_triggers" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "dm_text" TEXT NOT NULL,
    "comment_reply" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_keyword_triggers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "instagram_keyword_triggers_project_id_keyword_key" ON "instagram_keyword_triggers"("project_id", "keyword");

ALTER TABLE "instagram_keyword_triggers" ADD CONSTRAINT "instagram_keyword_triggers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "social_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
