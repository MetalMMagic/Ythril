/**
 * Component liveness for the Instance panel — reported, never gating.
 *
 * F9 follow-up: the Overview showed that an instance was up, but not whether the pieces it delegates
 * to are. "Documents stopped being extracted" and "the renderer container died" were the same screen.
 *
 * ── Why this is separate from /ready, and must stay separate ────────────────────────────────────
 *
 * `/ready` is an ORCHESTRATION probe. A 503 there tells Kubernetes or Docker to take the instance out
 * of service, so only things that make the instance genuinely unable to serve belong in it — MongoDB,
 * and the vector index the brain depends on.
 *
 * Every component below is OPTIONAL. The render sidecars are opt-in; the NLI judge ships with no
 * endpoint at all and the contradiction scanner is off by default. An instance without any of them
 * works perfectly for everything else it does. Folding them into `/ready` would mean a dead
 * doc-render container pulling a healthy instance out of the load balancer — turning a degraded
 * feature into an outage, which is a far worse failure than the one it reports.
 *
 * So this answers a different question: not "should traffic reach this instance" but "which parts are
 * currently working". The two must not be conflated, and the summary below is the shape of that
 * distinction rather than a rollup of booleans.
 */

/** One probed component. `configured: false` means the operator never asked for it. */
export interface ComponentHealth {
  /** Stable id the UI keys off. */
  id: string;
  /** Human label for the panel. */
  label: string;
  /** Whether this instance is set up to use it at all. */
  configured: boolean;
  /** Reachability. `null` when not configured — absence of a probe, not a failed one. */
  reachable: boolean | null;
  /** Why it matters, shown when it is down. */
  impact: string;
}

export type HealthLevel = 'ok' | 'degraded' | 'unknown';

export interface HealthSummary {
  level: HealthLevel;
  components: ComponentHealth[];
  /** Ids of configured components that are not reachable. Empty when level is 'ok'. */
  down: string[];
}

/**
 * Roll component probes into one level.
 *
 * The rules, and each exists because the naive version is misleading:
 *
 *   - a component the operator never configured is NOT a problem. Reporting "degraded" because an
 *     optional sidecar nobody wanted is absent would make the panel permanently yellow, and a warning
 *     that is always on is one nobody reads.
 *   - a configured component that is unreachable IS degraded — never "down". Nothing here can take the
 *     instance out of service, and saying "down" invites someone to treat it as an outage.
 *   - no components configured at all is `ok`, not `unknown`: a plain instance with no sidecars is a
 *     supported, healthy configuration, not an unknown one.
 */
export function summariseHealth(components: readonly ComponentHealth[]): HealthSummary {
  const down = components
    .filter(c => c.configured && c.reachable === false)
    .map(c => c.id);

  // `unknown` is reserved for a configured component whose probe could not run at all — distinct from
  // one that ran and failed, because "we could not check" and "it is broken" want different responses.
  const unprobed = components.some(c => c.configured && c.reachable === null);

  const level: HealthLevel = down.length > 0 ? 'degraded' : unprobed ? 'unknown' : 'ok';
  return { level, components: [...components], down };
}
