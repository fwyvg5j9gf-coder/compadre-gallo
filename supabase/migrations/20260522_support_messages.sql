CREATE TABLE IF NOT EXISTS support_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_email_id text UNIQUE NOT NULL,
  message_id      text,
  from_email      text NOT NULL,
  from_name       text,
  to_email        text,
  subject         text,
  body_text       text,
  body_html       text,
  status          text NOT NULL DEFAULT 'unread',
  created_at      timestamptz NOT NULL DEFAULT now(),
  replied_at      timestamptz,
  reply_resend_id text
);

CREATE INDEX support_messages_status_idx     ON support_messages(status);
CREATE INDEX support_messages_created_at_idx ON support_messages(created_at DESC);
