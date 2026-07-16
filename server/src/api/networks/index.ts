/**
 * Network management API — CRUD for Ythril sync networks.
 *
 * Route prefix: /api/networks
 * Authentication: requireAdmin (PAT Bearer token)
 *
 * This index mounts the per-concern sub-routers.
 *
 * Was a single 1196-line api/networks.ts with 19 routes (A17.5). Each sub-router declares full paths,
 * so every URL is unchanged. Mount order preserves the original registration order between groups:
 * `POST /join-remote` must stay reachable (crud declares no `POST /:id`, so there is no shadowing).
 */
import { Router } from 'express';
import { crudRouter } from './crud.js';
import { membersRouter } from './members.js';
import { joinRouter } from './join.js';
import { topologyRouter } from './topology.js';
import { votesRouter } from './votes.js';

export const networksRouter = Router();
networksRouter.use(crudRouter);
networksRouter.use(membersRouter);
networksRouter.use(joinRouter);
networksRouter.use(topologyRouter);
networksRouter.use(votesRouter);
