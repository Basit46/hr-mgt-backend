# File Upload Guide

Uploads are handled by Cloudinary. Both admins and employees use the same endpoint.

## `POST /uploads`

**Headers:** `Authorization: Bearer <jwt>` (required — admin or employee, either works)

**Request:** `multipart/form-data`, single field named **`file`**

```js
const formData = new FormData();
formData.append('file', file); // File from <input type="file">

const res = await fetch(`${API_URL}/uploads`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` }, // do NOT set Content-Type
  body: formData,
});

const body = await res.json();
```

Do **not** set `Content-Type` manually — the browser must add the multipart boundary.

**Allowed:** `.jpg .jpeg .png .webp .gif .pdf .doc .docx .xls .xlsx`, max 10 MB.

### 201 response

```json
{
  "status": "success",
  "message": "File uploaded successfully",
  "statusCode": 201,
  "data": {
    "url": "https://res.cloudinary.com/.../photo_ab12.png",
    "public_id": "hr-mgt/employee/photo_ab12",
    "original_name": "photo.png",
    "folder": "hr-mgt/employee",
    "resource_type": "image",
    "format": "png",
    "size": 12345
  }
}
```

### Errors

Always `data: null`, read `message`:

```json
{
  "status": "error",
  "message": "Unsupported file type: x.exe. Allowed: .jpg, .jpeg, .png, .webp, .gif, .pdf, .doc, .docx, .xls, .xlsx",
  "statusCode": 400,
  "data": null
}
```

| Code | When |
| --- | --- |
| 400 | unsupported type / no file / over 10 MB |
| 401 | missing or invalid token |
| 403 | token valid but role not allowed |
| 503 | Cloudinary env vars missing, or upload failed |

## Usage

Send the returned `data.url` to the field that expects a URL:

- `POST /admin/assets` → `image`
- `PATCH /admin/users/:id` → `avatar`
- `PATCH /employees/me` → `avatar`

Note: there is no delete endpoint, so replacing an image leaves the previous file in the Cloudinary account.