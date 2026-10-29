
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-media', 'generated-media', true)
ON CONFLICT (id) DO NOTHING;
