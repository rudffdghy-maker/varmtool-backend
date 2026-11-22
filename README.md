# VARMTOOL Backend (starter)

Node.js/Express backend for a first Facebook Page video-publishing test.

## Important security notes
- Never commit `.env` or access tokens to GitHub.
- Set secrets only in Render Environment Variables.
- `ADMIN_PASSWORD` is a temporary MVP protection mechanism. Use a long, unique password and do not embed it in public frontend JavaScript.
- The first version buffers video uploads in memory and limits uploads to 100 MB. It is for controlled testing, not large-scale production.
- A manually generated Page Access Token can expire or be revoked. Production should use Meta OAuth and secure token lifecycle management.

## Render settings
- Runtime: Node
- Build Command: `npm install`
- Start Command: `npm start`

## Environment Variables
- `PAGE_ID`: your Facebook Page ID
- `PAGE_ACCESS_TOKEN`: Page Access Token (secret)
- `ADMIN_PASSWORD`: long, unique admin password
- `FRONTEND_ORIGIN`: exact GitHub Pages origin, e.g. `https://YOUR-USERNAME.github.io`
- `GRAPH_API_VERSION`: `v27.0` (update to a version supported by your Meta app)

## Endpoints
- `GET /api/health`
- `POST /api/publish-video` multipart form fields: `video`, `caption`; header: `x-admin-password`
