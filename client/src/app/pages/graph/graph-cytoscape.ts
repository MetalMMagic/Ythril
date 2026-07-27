/**
 * The cytoscape boundary — theme, stylesheet, element model, and instance wiring.
 *
 * Extracted from `graph.component.ts` as part of the god-file split. Everything cytoscape-shaped lives
 * here so the component holds no `any`-typed renderer state and no 120-line style literal.
 *
 * ── The line this module draws ───────────────────────────────────────────────────────────────────
 *
 * `buildElements` is pure and is the ONLY thing the characterization tests assert across this
 * boundary: they pin the element model handed to cytoscape, never what cytoscape draws with it. That
 * is deliberate — cytoscape renders to a real canvas that jsdom does not provide, so testing its
 * output would mean testing the mock. Pinning the model instead means this renderer could be replaced
 * wholesale and the tests would still be measuring the right thing.
 *
 * Everything else here — the stylesheet, the theme read, the instance creation — is configuration and
 * wiring, verified by looking at the page rather than by assertion.
 */
import cytoscape from 'cytoscape';
import type { Entity, TraverseNode, TraverseEdge } from '../../core/api.types';

/** Colours read from CSS custom properties, so an enterprise theme can override the whole graph. */
export interface GraphTheme {
  typeColors: string[];
  nodeBg: string;
  nodeText: string;
  edge: string;
  edgeLabel: string;
  nodeRoot: string;
  nodeSelect: string;
  edgeSelect: string;
  edgeHover: string;
  fallback: string;
}

const DEFAULT_TYPE_COLORS = [
  '#7c6af7', '#58a6ff', '#3fb950', '#00e5ff', '#f85149',
  '#e38625', '#9580ff', '#79c0ff', '#56d364', '#ff6eb4',
];

/**
 * The palette before the view exists.
 *
 * `typeColors` is EMPTY on purpose, not pre-filled with the defaults above: `typeColor` treats an
 * empty palette as "theme not read yet" and returns a single fixed colour. Seeding it here would make
 * nodes render one set of colours before `readGraphTheme()` runs and another after.
 */
export const DEFAULT_GRAPH_THEME: GraphTheme = {
  typeColors: [],
  nodeBg: '#0d1117',
  nodeText: '#c9d1d9',
  edge: '#3d444d',
  edgeLabel: '#6e7681',
  nodeRoot: '#7c6af7',
  nodeSelect: '#58a6ff',
  edgeSelect: '#7c6af7',
  edgeHover: '#58a6ff',
  fallback: '#8b949e',
};

/**
 * Read the graph palette from the document's CSS custom properties.
 *
 * Must run after the view exists — the values live on `:root` and are resolved by the browser, so
 * calling this before the stylesheet applies yields the fallbacks.
 */
export function readGraphTheme(): GraphTheme {
  const cs = getComputedStyle(document.documentElement);
  const tv = (v: string, fb: string) => cs.getPropertyValue(v).trim() || fb;
  return {
    typeColors: DEFAULT_TYPE_COLORS.map((fb, i) => tv(`--graph-type-${i + 1}`, fb)),
    nodeBg: tv('--graph-node-bg', '#0d1117'),
    nodeText: tv('--graph-node-text', '#c9d1d9'),
    edge: tv('--graph-edge', '#3d444d'),
    edgeLabel: tv('--graph-edge-label', '#6e7681'),
    nodeRoot: tv('--graph-node-root', '#7c6af7'),
    nodeSelect: tv('--graph-node-select', '#58a6ff'),
    edgeSelect: tv('--graph-edge-select', '#7c6af7'),
    edgeHover: tv('--graph-edge-hover', '#58a6ff'),
    fallback: tv('--graph-fallback', '#8b949e'),
  };
}

/**
 * A stable colour per entity type.
 *
 * Hashed rather than assigned, so a type keeps its colour across sessions and spaces without anything
 * having to persist the mapping — and a type the palette has never seen still gets a colour.
 */
export function typeColor(theme: GraphTheme, type: string): string {
  if (!theme.typeColors.length) return '#7c6af7';
  let hash = 0;
  for (let i = 0; i < type.length; i++) hash = (hash * 31 + type.charCodeAt(i)) | 0;
  return theme.typeColors[Math.abs(hash) % theme.typeColors.length];
}

/** Radial highlight in the upper-left quadrant — gives each node its glass look. */
function glassShineSvg(color: string): string {
  const c = encodeURIComponent(color);
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><defs><radialGradient id='base' cx='50%25' cy='50%25' r='50%25'><stop offset='0%25' stop-color='${c}' stop-opacity='0.28'/><stop offset='100%25' stop-color='${c}' stop-opacity='0.06'/></radialGradient><radialGradient id='shine' cx='30%25' cy='22%25' r='50%25'><stop offset='0%25' stop-color='white' stop-opacity='0.55'/><stop offset='45%25' stop-color='white' stop-opacity='0.12'/><stop offset='100%25' stop-color='white' stop-opacity='0'/></radialGradient><radialGradient id='rim' cx='50%25' cy='50%25' r='50%25'><stop offset='68%25' stop-color='${c}' stop-opacity='0'/><stop offset='100%25' stop-color='${c}' stop-opacity='0.7'/></radialGradient><radialGradient id='bot' cx='58%25' cy='80%25' r='38%25'><stop offset='0%25' stop-color='${c}' stop-opacity='0.18'/><stop offset='100%25' stop-color='${c}' stop-opacity='0'/></radialGradient></defs><circle cx='50' cy='50' r='49' fill='url(%23base)'/><circle cx='50' cy='50' r='49' fill='url(%23rim)'/><circle cx='50' cy='50' r='49' fill='url(%23bot)'/><circle cx='50' cy='50' r='49' fill='url(%23shine)'/></svg>`;
}

/**
 * The cytoscape stylesheet.
 *
 * Node size, opacity and shadow all taper with `depth`, so distance from the root reads visually
 * rather than only from the layout — that is why so many values are functions of the element.
 */
function graphStylesheet(theme: GraphTheme): any[] {
  const depthOf = (ele: any) => +ele.data('depth');
  const colorOf = (ele: any) => typeColor(theme, ele.data('type') || 'default');
  const nodeSize = (ele: any) => { const d = depthOf(ele); return d === 0 ? 68 : Math.max(36, 52 - d * 3); };

  return [
    {
      selector: 'node',
      style: {
        'width': nodeSize,
        'height': nodeSize,
        'background-color': theme.nodeBg,
        'background-image': (ele: any) => glassShineSvg(colorOf(ele)),
        'background-fit': 'cover',
        'background-clip': 'node',
        'border-width': (ele: any) => depthOf(ele) === 0 ? 2.5 : 1.5,
        'border-color': colorOf,
        'border-opacity': 0.75,
        'label': 'data(label)',
        'font-size': (ele: any) => depthOf(ele) === 0 ? 13 : 11,
        'font-weight': (ele: any) => depthOf(ele) === 0 ? '600' : '400',
        'color': theme.nodeText,
        'text-outline-color': theme.nodeBg,
        'text-outline-width': 2,
        'text-valign': 'bottom',
        'text-margin-y': 8,
        'text-max-width': '110px',
        'text-wrap': 'ellipsis',
        'opacity': (ele: any) => { const d = depthOf(ele); return d === 0 ? 1 : Math.max(0.55, 1 - d * 0.1); },
        'shadow-blur': (ele: any) => depthOf(ele) === 0 ? 28 : 14,
        'shadow-color': colorOf,
        'shadow-opacity': (ele: any) => depthOf(ele) === 0 ? 0.6 : 0.35,
        'shadow-offset-x': 0,
        'shadow-offset-y': 0,
      } as any,
    },
    {
      selector: 'node.root',
      style: { 'border-color': theme.nodeRoot, 'border-width': 3, 'border-opacity': 1 } as any,
    },
    {
      selector: 'node.hovered',
      style: { 'border-width': 2.5, 'border-opacity': 1, 'opacity': 1, 'shadow-blur': 30, 'shadow-opacity': 0.8 } as any,
    },
    {
      selector: 'node:selected',
      style: {
        'border-color': theme.nodeSelect, 'border-width': 3, 'border-opacity': 1, 'opacity': 1,
        'shadow-blur': 36, 'shadow-color': theme.nodeSelect, 'shadow-opacity': 0.9,
      } as any,
    },
    {
      selector: 'edge',
      style: {
        'width': 1.5,
        'line-color': theme.edge,
        'target-arrow-shape': 'triangle',
        'target-arrow-color': theme.edge,
        'curve-style': 'bezier',
        'label': 'data(label)',
        'font-size': 10,
        'color': theme.edgeLabel,
        'text-rotation': 'autorotate',
        'text-margin-y': -8,
        'text-background-color': theme.nodeBg,
        'text-background-opacity': 0.7,
        'text-background-padding': '2px',
        'opacity': 0.75,
        'shadow-blur': 0,
      } as any,
    },
    {
      selector: 'edge.hovered',
      style: {
        'line-color': theme.edgeHover, 'target-arrow-color': theme.edgeHover, 'opacity': 1, 'width': 2.5,
        'shadow-blur': 12, 'shadow-color': theme.edgeHover, 'shadow-opacity': 0.6,
        'shadow-offset-x': 0, 'shadow-offset-y': 0,
      } as any,
    },
    {
      selector: 'edge:selected',
      style: {
        'line-color': theme.edgeSelect, 'target-arrow-color': theme.edgeSelect, 'opacity': 1, 'width': 2.5,
        'shadow-blur': 16, 'shadow-color': theme.edgeSelect, 'shadow-opacity': 0.7,
        'shadow-offset-x': 0, 'shadow-offset-y': 0,
      } as any,
    },
    { selector: 'edge.hide-labels', style: { 'label': '' } as any },
  ];
}

/**
 * The element model for one render — the pure half of this module, and the thing the characterization
 * tests assert.
 *
 * The root is added here rather than coming from the traversal: a traversal returns what it reached
 * FROM the root, never the root itself. It is emitted at depth 0 with the `root` class, and skipped in
 * the node loop so a traversal that does echo it back cannot produce a duplicate id.
 *
 * `from`/`to` become `source`/`target` because that is the shape cytoscape requires — the rename is
 * the whole reason this translation exists.
 */
export function buildElements(
  root: Entity | null,
  nodes: readonly TraverseNode[],
  edges: readonly TraverseEdge[],
  rootId: string,
): any[] {
  const elements: any[] = [];

  if (root) {
    elements.push({
      group: 'nodes',
      data: { id: root._id, label: root.name, type: root.type || 'default', depth: 0 },
      classes: 'root',
    });
  }

  for (const n of nodes) {
    if (n._id === rootId) continue;    // already added above
    elements.push({
      group: 'nodes',
      data: { id: n._id, label: n.name, type: n.type || 'default', depth: n.depth },
    });
  }

  for (const e of edges) {
    elements.push({ group: 'edges', data: { id: e._id, source: e.from, target: e.to, label: e.label } });
  }

  return elements;
}

/** What the component wants to know about, expressed without any cytoscape types. */
export interface GraphHandlers {
  onNodeTap(id: string): void;
  onEdgeTap(id: string): void;
  onNodeDoubleTap(id: string): void;
  onBackgroundTap(): void;
}

/**
 * Create the instance and wire the handlers.
 *
 * These callbacks fire OUTSIDE the Angular zone. That is safe here only because every one of them
 * ends up writing a signal, and signal writes notify OnPush regardless of zone — a handler that set a
 * plain field instead would update nothing on screen. The hover handlers stay inside this module
 * because they only toggle cytoscape's own classes and never touch Angular state.
 */
export function createGraphCytoscape(
  container: HTMLElement,
  theme: GraphTheme,
  handlers: GraphHandlers,
): any {
  const cy = cytoscape({
    container,
    elements: [],
    style: graphStylesheet(theme),
    layout: { name: 'grid' },
    minZoom: 0.1,
    maxZoom: 5,
    wheelSensitivity: 0.25,
  } as any);

  cy.on('tap', 'node', (evt: any) => handlers.onNodeTap(evt.target.data('id')));
  cy.on('tap', 'edge', (evt: any) => handlers.onEdgeTap(evt.target.data('id')));
  cy.on('dbltap', 'node', (evt: any) => handlers.onNodeDoubleTap(evt.target.data('id')));

  cy.on('mouseover', 'node', (evt: any) => { evt.target.addClass('hovered'); });
  cy.on('mouseout',  'node', (evt: any) => { evt.target.removeClass('hovered'); });
  cy.on('mouseover', 'edge', (evt: any) => { evt.target.addClass('hovered'); });
  cy.on('mouseout',  'edge', (evt: any) => { evt.target.removeClass('hovered'); });

  // Background tap — identified by the event target being the instance itself, not an element.
  cy.on('tap', (evt: any) => { if (evt.target === cy) handlers.onBackgroundTap(); });

  return cy;
}

/**
 * Draw an element model, then fit.
 *
 * `resize()` runs twice deliberately: once before drawing, and again on `layoutstop`, because Angular
 * may have opened or closed the side panel in between — which changes the canvas width without
 * cytoscape knowing. Fitting against stale dimensions is what makes a graph render half off-screen.
 */
export function renderElements(
  cy: any,
  elements: any[],
  rootId: string,
  hideLabels: boolean,
  onSettled: () => void,
): void {
  cy.resize();
  cy.elements().remove();
  cy.add(elements);

  if (hideLabels) cy.edges().addClass('hide-labels');
  else cy.edges().removeClass('hide-labels');

  // breadthfirst keeps each node next to its direct edge-partner.
  const layout = cy.layout({
    name: 'breadthfirst',
    roots: `#${rootId}`,
    directed: false,
    spacingFactor: 1.1,
    padding: 40,
    avoidOverlap: true,
    animate: true,
    animationDuration: 400,
  } as any);

  layout.on('layoutstop', onSettled);
  layout.run();
}
