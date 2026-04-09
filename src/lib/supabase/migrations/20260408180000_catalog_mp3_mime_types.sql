-- Allow common browser-playable audio types in catalog_mp3 (Library versions).
update storage.buckets
set allowed_mime_types = array[
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/flac',
  'audio/x-flac',
  'audio/ogg',
  'audio/opus',
  'application/ogg',
  'audio/webm'
]
where id = 'catalog_mp3';

-- Assistant attachments: same audio MIME allow-list + 50MB cap (matches app route).
update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'text/csv',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/wave',
    'audio/mp4',
    'audio/x-m4a',
    'audio/aac',
    'audio/flac',
    'audio/x-flac',
    'audio/ogg',
    'audio/opus',
    'application/ogg',
    'audio/webm'
  ]
where id = 'agent_attachments';
