CREATE TABLE "instagram_inbox_events" (
    "id" TEXT NOT NULL,
    "event_key" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "sender_username" TEXT,
    "object_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reply_text" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_inbox_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "instagram_inbox_events_event_key_key"
ON "instagram_inbox_events"("event_key");

CREATE INDEX "instagram_inbox_events_status_next_attempt_at_idx"
ON "instagram_inbox_events"("status", "next_attempt_at");

CREATE INDEX "instagram_inbox_events_sender_id_created_at_idx"
ON "instagram_inbox_events"("sender_id", "created_at");
