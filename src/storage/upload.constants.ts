export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const ALLOWED_EXTENSIONS: readonly string[] = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
];

export const FALLBACK_MIME_TYPE = 'application/octet-stream';

export const BASE_FOLDER = 'hr-mgt';

export const FOLDER_BY_ROLE = {
  admin: `${BASE_FOLDER}/admin`,
  employee: `${BASE_FOLDER}/employee`,
} as const;
