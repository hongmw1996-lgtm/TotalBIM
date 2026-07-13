# IFC BIM Viewer

Next.js App Router prototype for IFC upload and a BIM viewer workspace.

## Local Setup

1. Install dependencies:

```powershell
npm.cmd install
```

2. Create `.env` from `.env.example`.

```powershell
Copy-Item .env.example .env
```

3. Start PostgreSQL.

If Docker is installed:

```powershell
docker compose up -d postgres
```

If Docker is not installed, run a local PostgreSQL server and match this connection string:

```text
postgresql://postgres:postgres@localhost:5432/ifc_bim_viewer?schema=public
```

4. Apply migrations:

```powershell
npm.cmd run db:migrate
```

5. Start the app:

```powershell
npm.cmd run dev
```

Open `http://localhost:3000/viewer`.

## Current Viewer Scope

The viewer uses a server-generated Fragments derivative for geometry loading instead of pushing the original IFC directly into the browser. Uploaded IFC files are stored on the server upload volume for processing, and generated derivatives are registered on the model and stored through the object storage adapter.

Large IFC files should be uploaded through the streaming raw upload API:

```http
PUT /api/ifc/upload/raw?fileName=model.ifc
Content-Type: application/octet-stream
```

The viewer upload button uses this endpoint and automatically enqueues derivative processing after the original IFC upload succeeds.

## Object Storage

Development default:

```env
OBJECT_STORAGE_PROVIDER="LOCAL"
LOCAL_OBJECT_STORAGE_DIR="object-storage"
```

Recommended production options:

- `BLOB`: Vercel Blob for direct browser uploads and viewer-ready derivatives
- `R2`: Cloudflare R2, S3-compatible endpoint
- `S3`: AWS S3
- `GCS`: Google Cloud Storage using Application Default Credentials

For Vercel Blob:

```env
OBJECT_STORAGE_PROVIDER="BLOB"
BLOB_STORE_ID="store_..."
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

For R2/S3:

```env
OBJECT_STORAGE_PROVIDER="R2"
OBJECT_STORAGE_BUCKET="your-bucket"
OBJECT_STORAGE_REGION="auto"
OBJECT_STORAGE_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
OBJECT_STORAGE_ACCESS_KEY_ID="..."
OBJECT_STORAGE_SECRET_ACCESS_KEY="..."
```

For GCS:

```env
OBJECT_STORAGE_PROVIDER="GCS"
OBJECT_STORAGE_BUCKET="your-bucket"
```

The viewer should load generated `.frag` derivatives, not the original IFC file.

## Vercel Deployment

Required production services:

- PostgreSQL database for Prisma metadata and processing jobs
- Vercel Blob for direct uploads and viewer-ready `.frag` files
- A dedicated IFC worker process for conversion work that can exceed Vercel function duration limits
- Optional Google Drive OAuth credentials for archiving original IFC files after conversion

Set these Vercel environment variables before deploying:

```env
DATABASE_URL="postgresql://..."
IFC_MAX_UPLOAD_MB="250"
IFC_PROCESSING_MAX_ATTEMPTS="3"
IFC_PROCESSING_STALE_MINUTES="15"
BLOB_STORE_ID="store_..."
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
IFC_WORKER_TOKEN="long-random-token"
```

Deploy with Vercel CLI:

```powershell
npx.cmd vercel link
npx.cmd vercel env add DATABASE_URL production
npx.cmd vercel env add BLOB_STORE_ID production
npx.cmd vercel env add BLOB_READ_WRITE_TOKEN production
npx.cmd vercel env add IFC_WORKER_TOKEN production
npx.cmd vercel env add IFC_MAX_UPLOAD_MB production
npx.cmd vercel env add IFC_PROCESSING_MAX_ATTEMPTS production
npx.cmd vercel env add IFC_PROCESSING_STALE_MINUTES production
npx.cmd vercel deploy --prod
```

Apply database migrations against the production database before processing uploads:

```powershell
npm.cmd run db:deploy
```

The Vercel deployment only accepts uploads, records jobs, and serves derivatives. IFC conversion runs in a dedicated worker process.

## Processing IFC Derivatives

After uploading an IFC file and applying database migrations, enqueue the geometry derivative job:

```powershell
Invoke-WebRequest -Method POST http://localhost:3000/api/ifc/models/<model-id>/process
```

This returns `202 Accepted` and records an `IfcProcessingJob`. On Vercel, the app does not run the conversion inline. Start a worker on a long-running machine:

```powershell
npm.cmd run worker:ifc
```

For one polling pass:

```powershell
npm.cmd run worker:ifc:once
```

Check current model and job status:

```powershell
Invoke-WebRequest http://localhost:3000/api/ifc/models/<model-id>/process
```

Processing uses `@thatopen/fragments` and `web-ifc` in the worker to convert the original IFC into a `.frag` derivative. The derivative is saved through the configured object storage provider and registered as:

```text
kind: GEOMETRY
format: FRAG
lod: full
```

Operational processing settings:

```env
IFC_PROCESSING_MAX_ATTEMPTS="3"
IFC_PROCESSING_STALE_MINUTES="15"
```

If a server restarts while a job is marked `PROCESSING`, the app requeues stale jobs after `IFC_PROCESSING_STALE_MINUTES` when `/api/ifc/models` or `/api/ifc/models/<model-id>/process` is requested.

## Original IFC Archive To Google Drive

To reduce Vercel Blob storage usage, enable the worker archive policy:

```env
ORIGINAL_STORAGE_POLICY="archive-to-drive-delete-blob"
GOOGLE_DRIVE_CLIENT_ID="..."
GOOGLE_DRIVE_CLIENT_SECRET="..."
GOOGLE_DRIVE_REFRESH_TOKEN="..."
GOOGLE_DRIVE_ARCHIVE_FOLDER_ID="..."
```

Refresh token helper:

```powershell
# 1. Add GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET to .env.worker.local.
npm.cmd run gdrive:auth-url

# 2. Open the URL, approve Google Drive access, copy the `code` query value.
npm.cmd run gdrive:exchange-code -- <code>

# 3. Add ORIGINAL_STORAGE_POLICY and GOOGLE_DRIVE_ARCHIVE_FOLDER_ID, then restart the worker.
npm.cmd run worker:ifc
```

With this policy, the worker converts the IFC, uploads the `.frag` derivative to Blob, marks the model `READY`, uploads the original IFC to Google Drive, records the Drive file id on `IfcModel`, then asks the app API to delete the original Blob object. If Drive archiving fails, the `.frag` remains usable and the original Blob is kept.
