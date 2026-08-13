DROP INDEX "social_content_drafts_project_id_content_date_key";

CREATE INDEX "social_content_drafts_project_id_content_date_idx"
ON "social_content_drafts"("project_id", "content_date");
