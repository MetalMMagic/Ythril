/**
 * Audit log query endpoint.
 *
 * GET /api/admin/audit-log  — admin-only, paginated, filterable
 */

import { Router } from 'express';
import { requireAdmin } from '../auth/middleware.js';
import { globalRateLimit } from '../rate-limit/middleware.js';
import { queryAuditLog } from '../audit/audit.js';
import { getConfig } from '../config/loader.js';

export const auditRouter = Router();

auditRouter.get('/', globalRateLimit, requireAdmin, async (req, res) => {
  try {
    const params = {
      after: typeof req.query['after'] === 'string' ? req.query['after'] : undefined,
      before: typeof req.query['before'] === 'string' ? req.query['before'] : undefined,
      tokenId: typeof req.query['tokenId'] === 'string' ? req.query['tokenId'] : undefined,
      oidcSubject: typeof req.query['oidcSubject'] === 'string' ? req.query['oidcSubject'] : undefined,
      spaceId: typeof req.query['spaceId'] === 'string' ? req.query['spaceId'] : undefined,
      operation: typeof req.query['operation'] === 'string' ? req.query['operation'] : undefined,
      ip: typeof req.query['ip'] === 'string' ? req.query['ip'] : undefined,
      status: typeof req.query['status'] === 'string' ? parseInt(req.query['status'], 10) : undefined,
      limit: typeof req.query['limit'] === 'string' ? parseInt(req.query['limit'], 10) : undefined,
      offset: typeof req.query['offset'] === 'string' ? parseInt(req.query['offset'], 10) : undefined,
    };

    // Drop NaN values from parsed ints
    if (params.status !== undefined && isNaN(params.status)) params.status = undefined;
    if (params.limit !== undefined && isNaN(params.limit)) params.limit = undefined;
    if (params.offset !== undefined && isNaN(params.offset)) params.offset = undefined;

    const result = await queryAuditLog(params);
    const retentionDays = getConfig().audit?.retentionDays ?? 90;
    res.json({ ...result, retentionDays });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});
