-- Contact form sessions require their own channel, separate from live chat.
INSERT INTO support_channels (code, config_json)
VALUES ('contact', '{}')
ON CONFLICT (code) DO NOTHING;
