/**
 * /files  — Browser-based File Manager UI
 *
 * Server-rendered HTML over the same underlying files/files.ts primitives
 * used by the /api/files API.  Protected by the same settings session cookie
 * as /settings — no separate password required.
 *
 * GET    /files                          → redirect to first space
 * GET    /files/:spaceId?path=<dir>      → directory listing (or redirect to download for files)
 * GET    /files/:spaceId/download?path=  → stream file download (Content-Disposition: attachment)
 * POST   /files/:spaceId/upload?path=    → multipart upload (field: "files", max 20 files)
 * POST   /files/:spaceId/mkdir           → create folder (body: { parent, name })
 * POST   /files/:spaceId/delete          → delete file/dir (body: { path, returnPath, confirmDir? })
 * POST   /files/:spaceId/rename          → rename/move (body: { from, to, returnPath })
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fsPromises from 'fs/promises';
import { requireSettingsAuth } from '../settings/auth.js';
import { getConfig } from '../config/loader.js';
import {
  listDir,
  readFileBytes,
  writeFileBytes,
  deleteFile,
  createDir,
  moveFile,
} from '../files/files.js';
import type { FileEntry } from '../files/files.js';
import { resolveSafePath } from '../files/sandbox.js';
import { checkQuota, QuotaError } from '../quota/quota.js';
import { log } from '../util/log.js';

export const filesUiRouter = Router();

filesUiRouter.use(requireSettingsAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },   // per-file limit; quota enforced separately
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function esc(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Normalise a user-supplied path to a clean relative path (no leading slashes). */
function cleanPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\/+/, '').trim() || '.';
}

/** Safe basename — strips any directory component from things like "../../evil". */
function safeName(raw: string): string {
  return path.basename(raw.replace(/\\/g, '/'));
}

// ── MIME map for downloads ────────────────────────────────────────────────────
const MIME_MAP: Record<string, string> = {
  '.txt': 'text/plain', '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json', '.html': 'text/html',
  '.css': 'text/css', '.js': 'text/javascript', '.ts': 'text/plain',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf', '.zip': 'application/zip',
  '.xml': 'application/xml', '.csv': 'text/csv', '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
};

// ── GET /files → redirect to first space ─────────────────────────────────────
filesUiRouter.get('/', (_req, res) => {
  const cfg = getConfig();
  const first = cfg.spaces[0]?.id ?? 'general';
  res.redirect(302, `/files/${first}`);
});

// ── GET /files/:spaceId — directory browser ───────────────────────────────────
filesUiRouter.get('/:spaceId', async (req, res) => {
  const { spaceId } = req.params as { spaceId: string };
  const cfg = getConfig();
  const spaces = cfg.spaces.map(s => ({ id: s.id, label: s.label }));
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8')
      .send(`<p>Space not found. <a href="/files">Back</a></p>`);
    return;
  }

  const currentPath = cleanPath(typeof req.query['path'] === 'string' ? req.query['path'] : '.');
  const error = typeof req.query['error'] === 'string' ? req.query['error'] : undefined;
  const msg = typeof req.query['msg'] === 'string' ? req.query['msg'] : undefined;

  let entries: FileEntry[] = [];
  try {
    entries = await listDir(spaceId, currentPath);
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'ENOTDIR') {
      // Path is a file — send to download
      res.redirect(302, `/files/${encodeURIComponent(spaceId)}/download?path=${encodeURIComponent(currentPath)}`);
      return;
    }
    if (e.code === 'ENOENT') {
      res.redirect(303, `/files/${spaceId}?error=${encodeURIComponent('Directory not found')}`);
      return;
    }
    res.redirect(303, `/files/${spaceId}?error=${encodeURIComponent(String(err))}`);
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(fileBrowserPage(spaceId, currentPath, entries, spaces, error, msg));
});

// ── GET /files/:spaceId/download — stream file ────────────────────────────────
filesUiRouter.get('/:spaceId/download', async (req, res) => {
  const { spaceId } = req.params as { spaceId: string };
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).send('Space not found');
    return;
  }
  const filePath = cleanPath(typeof req.query['path'] === 'string' ? req.query['path'] : '');
  if (!filePath || filePath === '.') {
    res.status(400).send('Missing path');
    return;
  }
  try {
    const bytes = await readFileBytes(spaceId, filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_MAP[ext] ?? 'application/octet-stream';
    const filename = path.basename(filePath).replace(/"/g, '\\"');
    res
      .status(200)
      .setHeader('Content-Type', contentType)
      .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      .setHeader('Content-Length', bytes.length)
      .setHeader('X-Content-Type-Options', 'nosniff')
      .send(bytes);
  } catch {
    res.status(404).send('File not found');
  }
});

// ── POST /files/:spaceId/upload — multipart upload ────────────────────────────
filesUiRouter.post('/:spaceId/upload', upload.array('files', 20), async (req, res) => {
  const { spaceId } = req.params as { spaceId: string };
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).send('Space not found');
    return;
  }
  const dir = cleanPath(typeof req.query['path'] === 'string' ? req.query['path'] : '.');
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    res.redirect(303, `/files/${spaceId}?path=${encodeURIComponent(dir)}&error=${encodeURIComponent('No files selected')}`);
    return;
  }

  // Quota check before any writes
  try {
    await checkQuota('files');
  } catch (err) {
    if (err instanceof QuotaError) {
      res.redirect(303, `/files/${spaceId}?path=${encodeURIComponent(dir)}&error=${encodeURIComponent('Storage quota exceeded')}`);
      return;
    }
    throw err;
  }

  const errors: string[] = [];
  for (const file of files) {
    const filename = safeName(file.originalname) || 'upload';
    const destPath = dir === '.' ? filename : `${dir}/${filename}`;
    try {
      await writeFileBytes(spaceId, destPath, file.buffer);
      log.info(`Files UI: uploaded ${destPath} to space ${spaceId} (${file.size} bytes)`);
    } catch (err) {
      errors.push(`${filename}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (errors.length) {
    res.redirect(303, `/files/${spaceId}?path=${encodeURIComponent(dir)}&error=${encodeURIComponent(errors.join('; '))}`);
    return;
  }
  res.redirect(303, `/files/${spaceId}?path=${encodeURIComponent(dir)}&msg=${encodeURIComponent(`Uploaded ${files.length} file${files.length !== 1 ? 's' : ''}`)}`);
});

// ── POST /files/:spaceId/mkdir — create folder ────────────────────────────────
filesUiRouter.post('/:spaceId/mkdir', async (req, res) => {
  const { spaceId } = req.params as { spaceId: string };
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).send('Space not found');
    return;
  }
  const parent = cleanPath((req.body?.parent ?? '.').toString().trim());
  const name = (req.body?.name ?? '').toString().trim();
  if (!name) {
    res.redirect(303, `/files/${spaceId}?path=${encodeURIComponent(parent)}&error=${encodeURIComponent('Folder name is required')}`);
    return;
  }
  if (name.includes('/') || name.includes('\\') || name === '.' || name === '..') {
    res.redirect(303, `/files/${spaceId}?path=${encodeURIComponent(parent)}&error=${encodeURIComponent('Invalid folder name')}`);
    return;
  }
  const fullPath = parent === '.' ? name : `${parent}/${name}`;
  try {
    await createDir(spaceId, fullPath);
    log.info(`Files UI: created dir ${fullPath} in space ${spaceId}`);
    res.redirect(303, `/files/${spaceId}?path=${encodeURIComponent(fullPath)}&msg=${encodeURIComponent('Folder created')}`);
  } catch (err) {
    res.redirect(303, `/files/${spaceId}?path=${encodeURIComponent(parent)}&error=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`);
  }
});

// ── POST /files/:spaceId/delete — delete file or directory ───────────────────
filesUiRouter.post('/:spaceId/delete', async (req, res) => {
  const { spaceId } = req.params as { spaceId: string };
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).send('Space not found');
    return;
  }
  const filePath = cleanPath((req.body?.path ?? '').toString().trim());
  const returnPath = cleanPath((req.body?.returnPath ?? '.').toString().trim());
  const confirmDir = req.body?.confirmDir === 'on' || req.body?.confirmDir === 'true';

  if (!filePath || filePath === '.') {
    res.redirect(303, `/files/${spaceId}?path=${encodeURIComponent(returnPath)}&error=${encodeURIComponent('Cannot delete root')}`);
    return;
  }

  let absPath: string;
  try {
    absPath = resolveSafePath(spaceId, filePath);
  } catch (err) {
    res.redirect(303, `/files/${spaceId}?path=${encodeURIComponent(returnPath)}&error=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`);
    return;
  }

  try {
    const stat = await fsPromises.stat(absPath);
    if (stat.isDirectory()) {
      if (!confirmDir) {
        res.redirect(303, `/files/${spaceId}?path=${encodeURIComponent(returnPath)}&error=${encodeURIComponent('Check the box to confirm deleting this folder and all its contents')}`);
        return;
      }
      await fsPromises.rm(absPath, { recursive: true });
      log.info(`Files UI: deleted dir ${filePath} from space ${spaceId}`);
    } else {
      await deleteFile(spaceId, filePath);
      log.info(`Files UI: deleted file ${filePath} from space ${spaceId}`);
    }
    res.redirect(303, `/files/${spaceId}?path=${encodeURIComponent(returnPath)}&msg=${encodeURIComponent('Deleted')}`);
  } catch (err) {
    res.redirect(303, `/files/${spaceId}?path=${encodeURIComponent(returnPath)}&error=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`);
  }
});

// ── POST /files/:spaceId/rename — rename / move ───────────────────────────────
filesUiRouter.post('/:spaceId/rename', async (req, res) => {
  const { spaceId } = req.params as { spaceId: string };
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).send('Space not found');
    return;
  }
  const from = cleanPath((req.body?.from ?? '').toString().trim());
  const toName = (req.body?.to ?? '').toString().trim();
  const returnPath = cleanPath((req.body?.returnPath ?? '.').toString().trim());

  if (!from || !toName) {
    res.redirect(303, `/files/${spaceId}?path=${encodeURIComponent(returnPath)}&error=${encodeURIComponent('Both source and new name are required')}`);
    return;
  }
  if (toName.includes('/') || toName.includes('\\')) {
    res.redirect(303, `/files/${spaceId}?path=${encodeURIComponent(returnPath)}&error=${encodeURIComponent('New name cannot contain path separators')}`);
    return;
  }

  // Move within same directory
  const parentDir = path.posix.dirname(from);
  const to = parentDir === '.' ? toName : `${parentDir}/${toName}`;

  try {
    await moveFile(spaceId, from, to);
    log.info(`Files UI: renamed ${from} → ${to} in space ${spaceId}`);
    res.redirect(303, `/files/${spaceId}?path=${encodeURIComponent(returnPath)}&msg=${encodeURIComponent('Renamed')}`);
  } catch (err) {
    res.redirect(303, `/files/${spaceId}?path=${encodeURIComponent(returnPath)}&error=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`);
  }
});

// ── HTML ──────────────────────────────────────────────────────────────────────

const baseStyle = `
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; background: #0f0f0f; color: #eee; margin: 0; padding: 2rem 1rem; }
  .wrap { max-width: 820px; margin: 0 auto; }
  h1 { font-size: 1.4rem; margin: 0; }
  p.sub { color: #888; font-size: 0.9rem; margin: 0 0 0.75rem; }
  label { display: block; margin-bottom: 0.25rem; font-size: 0.85rem; color: #aaa; }
  input[type=text] { padding: 0.5rem 0.75rem; border: 1px solid #444; border-radius: 6px; background: #111; color: #eee; font-size: 0.95rem; }
  input:focus { outline: none; border-color: #6060f0; }
  select { padding: 0.45rem 0.65rem; border: 1px solid #444; border-radius: 6px; background: #111; color: #eee; font-size: 0.9rem; }
  .btn { padding: 0.45rem 1rem; background: #6060f0; color: #fff; border: none; border-radius: 6px; font-size: 0.88rem; cursor: pointer; }
  .btn:hover { background: #7070ff; }
  .btn-sm { padding: 0.25rem 0.6rem; font-size: 0.8rem; }
  .btn-neutral { background: #333; }
  .btn-neutral:hover { background: #444; }
  .btn-danger { background: #6b1414; }
  .btn-danger:hover { background: #8b2020; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; margin-bottom: 1.5rem; }
  th, td { text-align: left; padding: 0.45rem 0.65rem; border-bottom: 1px solid #1e1e1e; }
  th { color: #666; font-weight: normal; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.03em; }
  tr:hover td { background: #0f1318; }
  .crumb { font-size: 0.88rem; color: #aaa; margin: 0.5rem 0 1.5rem; display: flex; flex-wrap: wrap; gap: 0.2rem; align-items: center; }
  .crumb a { color: #6080d0; text-decoration: none; }
  .crumb a:hover { text-decoration: underline; }
  .crumb .sep { color: #444; margin: 0 0.1rem; }
  .nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 0.75rem; flex-wrap: wrap; }
  .nav-left { display: flex; align-items: center; gap: 0.75rem; }
  .error { color: #f66; font-size: 0.9rem; margin-bottom: 0.75rem; }
  .msg { color: #4c4; font-size: 0.9rem; margin-bottom: 0.75rem; }
  details summary { cursor: pointer; font-size: 0.8rem; color: #888; list-style: none; user-select: none; }
  details summary::-webkit-details-marker { display: none; }
  .action-forms { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
  .rename-form { margin: 0.3rem 0 0; display: flex; gap: 0.35rem; align-items: center; }
  .rename-form input { width: 160px; padding: 0.3rem 0.5rem; font-size: 0.82rem; }
  .section-box { background: #111; border: 1px solid #222; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; }
  .section-title { font-size: 0.82rem; color: #888; margin-bottom: 0.6rem; text-transform: uppercase; letter-spacing: 0.04em; }
  .file-input-label { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.45rem 1rem; background: #333; color: #eee; border: 1px solid #555; border-radius: 6px; font-size: 0.88rem; cursor: pointer; }
  .file-input-label:hover { background: #444; }
  input[type=file] { display: none; }
  .upload-row { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
  .dir-icon { color: #f0a030; }
  .file-icon { color: #6080c0; }
`;

function breadcrumb(spaceId: string, currentPath: string): string {
  const parts = currentPath === '.' ? [] : currentPath.split('/').filter(Boolean);
  const crumbs: string[] = [
    `<a href="/files/${esc(spaceId)}">root</a>`,
  ];
  let accumulated = '';
  for (let i = 0; i < parts.length; i++) {
    accumulated = accumulated ? `${accumulated}/${parts[i]}` : parts[i]!;
    const isLast = i === parts.length - 1;
    if (isLast) {
      crumbs.push(`<span style="color:#eee">${esc(parts[i]!)}</span>`);
    } else {
      crumbs.push(`<a href="/files/${esc(spaceId)}?path=${encodeURIComponent(accumulated)}">${esc(parts[i]!)}</a>`);
    }
  }
  return `<div class="crumb">${crumbs.join('<span class="sep">/</span>')}</div>`;
}

function entryRows(
  spaceId: string,
  currentPath: string,
  entries: FileEntry[],
): string {
  if (entries.length === 0) {
    return `<tr><td colspan="5" style="color:#555;font-style:italic;text-align:center;padding:1.5rem">Empty folder</td></tr>`;
  }
  // Sort: dirs first, then files, alpha within each group
  const sorted = [...entries].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return sorted.map(e => {
    const fullPath = currentPath === '.' ? e.name : `${currentPath}/${e.name}`;
    const parentPath = currentPath; // return path for delete/rename is the current dir
    const isDir = e.type === 'dir';
    const icon = isDir
      ? `<span class="dir-icon">📁</span>`
      : `<span class="file-icon">📄</span>`;
    const nameCell = isDir
      ? `${icon} <a href="/files/${esc(spaceId)}?path=${encodeURIComponent(fullPath)}" style="color:#eee;text-decoration:none">${esc(e.name)}</a>`
      : `${icon} <a href="/files/${esc(spaceId)}/download?path=${encodeURIComponent(fullPath)}" style="color:#8090d0">${esc(e.name)}</a>`;

    const sizeCell = isDir ? '<span style="color:#444">—</span>' : `<span style="color:#888">${e.size !== undefined ? formatBytes(e.size) : '?'}</span>`;
    const modCell = e.modifiedAt ? `<span style="color:#666;font-size:0.78rem;white-space:nowrap">${e.modifiedAt.slice(0, 10)}</span>` : '<span style="color:#444">—</span>';

    const deleteForm = `
      <form method="POST" action="/files/${esc(spaceId)}/delete" style="margin:0"
            onsubmit="return confirm('Delete \u201c${esc(e.name)}\u201d?${isDir ? ' This will delete all contents.' : ''}')">
        <input type="hidden" name="path" value="${esc(fullPath)}">
        <input type="hidden" name="returnPath" value="${esc(parentPath)}">
        ${isDir ? '<input type="hidden" name="confirmDir" value="on">' : ''}
        <button class="btn btn-sm btn-danger" type="submit">Delete</button>
      </form>`;

    const renameForm = `
      <details>
        <summary>Rename</summary>
        <form method="POST" action="/files/${esc(spaceId)}/rename" class="rename-form">
          <input type="hidden" name="from" value="${esc(fullPath)}">
          <input type="hidden" name="returnPath" value="${esc(parentPath)}">
          <input type="text" name="to" value="${esc(e.name)}" required style="width:150px;padding:0.28rem 0.5rem;font-size:0.8rem">
          <button class="btn btn-sm" type="submit">OK</button>
        </form>
      </details>`;

    return `<tr>
      <td style="max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nameCell}</td>
      <td>${sizeCell}</td>
      <td>${modCell}</td>
      <td>
        <div class="action-forms">
          ${renameForm}
          ${deleteForm}
        </div>
      </td>
    </tr>`;
  }).join('');
}

function fileBrowserPage(
  spaceId: string,
  currentPath: string,
  entries: FileEntry[],
  spaces: { id: string; label: string }[],
  error?: string,
  msg?: string,
): string {
  const spaceLabel = spaces.find(s => s.id === spaceId)?.label ?? spaceId;
  const spaceOptions = spaces.map(s =>
    `<option value="${esc(s.id)}"${s.id === spaceId ? ' selected' : ''}>${esc(s.label)}</option>`,
  ).join('');

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ythril \u2014 Files: ${esc(spaceLabel)}</title><style>${baseStyle}</style></head><body>
<div class="wrap">
  <div class="nav">
    <div class="nav-left">
      <h1>ythril files</h1>
      <select onchange="location='/files/'+this.value" title="Switch space">${spaceOptions}</select>
    </div>
    <div style="display:flex;gap:0.5rem">
      <a class="btn btn-sm btn-neutral" href="/settings">Settings</a>
      <a class="btn btn-sm btn-neutral" href="/brain">Brain</a>
    </div>
  </div>

  ${breadcrumb(spaceId, currentPath)}
  ${error ? `<p class="error">${esc(error)}</p>` : ''}
  ${msg ? `<p class="msg">${esc(msg)}</p>` : ''}

  <table>
    <thead><tr><th>Name</th><th>Size</th><th>Modified</th><th>Actions</th></tr></thead>
    <tbody>${entryRows(spaceId, currentPath, entries)}</tbody>
  </table>

  <div style="display:flex;gap:0.75rem;flex-wrap:wrap;align-items:flex-start">
    <div class="section-box" style="flex:1;min-width:220px">
      <div class="section-title">Upload files</div>
      <form method="POST" action="/files/${esc(spaceId)}/upload?path=${encodeURIComponent(currentPath)}"
            enctype="multipart/form-data" id="uploadForm">
        <div class="upload-row">
          <label class="file-input-label" for="fileInput">
            📎 Choose files…
          </label>
          <input type="file" id="fileInput" name="files" multiple onchange="updateFileLabel(this)">
          <span id="fileLabel" style="font-size:0.82rem;color:#888">No files selected</span>
        </div>
        <button class="btn" type="submit" style="margin-top:0.6rem">Upload</button>
      </form>
    </div>

    <div class="section-box" style="min-width:200px">
      <div class="section-title">New folder</div>
      <form method="POST" action="/files/${esc(spaceId)}/mkdir" style="display:flex;gap:0.5rem;align-items:flex-end">
        <input type="hidden" name="parent" value="${esc(currentPath)}">
        <div>
          <label style="margin-bottom:0.2rem">Folder name</label>
          <input type="text" name="name" placeholder="e.g. docs" maxlength="200" required style="width:150px">
        </div>
        <button class="btn" type="submit">Create</button>
      </form>
    </div>
  </div>
</div>
<script>
function updateFileLabel(input) {
  const lbl = document.getElementById('fileLabel');
  if (input.files && input.files.length > 0) {
    lbl.textContent = input.files.length === 1
      ? input.files[0].name
      : input.files.length + ' files selected';
  } else {
    lbl.textContent = 'No files selected';
  }
}
</script>
</body></html>`;
}
