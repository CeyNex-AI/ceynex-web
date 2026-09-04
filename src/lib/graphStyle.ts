import type cytoscape from "cytoscape";
import type { Core, ElementDefinition, LayoutOptions, StylesheetJson } from "cytoscape";

/** `NodeShape` is not re-exported at the package root, only under `Css`. */
type NodeShape = cytoscape.Css.NodeShape;
import type { Theme } from "./siteApi";
import type { GraphEdge, GraphNode } from "../types/contracts";

/**
 * The knowledge graph's visual language, kept out of the component so the
 * drawing's rules are readable on their own and testable without a canvas.
 *
 * Palette is the app's existing teal/gray (Query.tsx, EvidencePanel, the
 * ConfidenceBadge band map). Teal is the brand accent and is spent on exactly
 * one thing here — the node the question was about — so "what is this a picture
 * of" is answerable at a glance. Everything else is graduated gray, varied by
 * shape rather than by hue: six labels rendered as six colours would be a
 * legend nobody reads, and would collide with the teal that already means
 * something.
 */

/**
 * Ring 0 is the focus. Lower number = closer to the centre.
 *
 * These describe how directly a *label* relates to the question's subject, and
 * so only apply to the graph that came back with the answer. Nodes pulled in by
 * an expansion use EXPANDED_RING instead: a discovered Commodity is ring 0 by
 * this table, which would place it on top of the focus node.
 */
const RING: Record<string, number> = {
  Commodity: 0,
  ApparelCategory: 0,
  Country: 1,
  HSCode: 1,
  District: 1,
  TradeAgreement: 2,
  PolicyDocument: 2,
};

/** Everything a click pulled in, on one outer ring: "further from the question"
 * rather than "what kind of thing this is". */
export const EXPANDED_RING = 3;

const NODE_SHAPE: Record<string, NodeShape> = {
  Commodity: "round-rectangle",
  ApparelCategory: "round-rectangle",
  Country: "ellipse",
  District: "diamond",
  HSCode: "hexagon",
  TradeAgreement: "octagon",
  PolicyDocument: "round-tag",
};

/**
 * All gray. Teal is applied by the `node[?focus]` rule below and nowhere else,
 * so it means "the subject of this question" rather than "a commodity" —
 * expanding a country pulls in other commodities, and colouring those teal too
 * would leave the accent meaning nothing. The label is carried by shape.
 *
 * Cytoscape draws to a <canvas>, not the DOM, so it can't pick up the
 * [data-theme="signal-deck"] CSS custom properties the rest of the app reacts
 * to automatically -- these two shades are hardcoded per theme here instead
 * (classic: Tailwind's stock gray-200/100; Signal Deck: index.css's
 * teal-tinted gray-200/100).
 */
function nodeFill(theme: Theme): Record<string, string> {
  const gray200 = theme === "signal-deck" ? "#d2e6df" : "#e5e7eb";
  const gray100 = theme === "signal-deck" ? "#e1f0eb" : "#f3f4f6";
  return {
    Commodity: gray200,
    ApparelCategory: gray200,
    Country: gray200,
    District: gray100,
    HSCode: gray200,
    TradeAgreement: gray100,
    PolicyDocument: gray100,
  };
}

/** Human wording for the four relationship types, for the legend and the
 * sr-only table. The raw SCREAMING_CASE is Neo4j's, not a reader's. */
export const RELATIONSHIP_LABELS: Record<string, string> = {
  EXPORTS_TO: "exports to",
  CLASSIFIED_AS: "classified as",
  PRODUCED_IN: "produced in",
  COVERED_BY: "covered by",
  ISSUED_BY: "issued by",
  APPLIES_TO: "applies to",
  DESCRIBES: "describes",
};

export function relationshipLabel(type: string): string {
  return RELATIONSHIP_LABELS[type] ?? type.toLowerCase().replace(/_/g, " ");
}

export function toElements(nodes: GraphNode[], edges: GraphEdge[]): ElementDefinition[] {
  return [
    ...nodes.map((node) => ({
      group: "nodes" as const,
      data: {
        id: node.id,
        name: node.name,
        kind: node.label,
        focus: node.focus,
        ring: node.focus ? 0 : (RING[node.label] ?? 2),
        properties: node.properties,
      },
    })),
    ...edges.map((edge) => ({
      group: "edges" as const,
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        kind: edge.type,
        label: edge.label ?? "",
        // 0..1 from the backend, mapped to 1.5..6px below. The floor matters:
        // a genuine but small trade flow drawn at zero width reads as no flow.
        weight: edge.weight ?? 0.25,
      },
    })),
  ];
}

/** Cytoscape's own stylesheet, rebuilt per theme (see `nodeFill`'s docstring
 * for why this can't just react to CSS custom properties like the rest of
 * the app). The teal accent (`node[?focus]`, `node:selected`,
 * `node.expanded`) is unchanged across themes -- it's the real brand colour
 * in both. */
export function buildStylesheet(theme: Theme): StylesheetJson {
  const fill = nodeFill(theme);
  const gray700 = theme === "signal-deck" ? "#324b44" : "#374151";
  const gray500 = theme === "signal-deck" ? "#5f8178" : "#6b7280";
  const gray300 = theme === "signal-deck" ? "#b4d1c8" : "#d1d5db";
  const lineColor = theme === "signal-deck" ? "#b4d1c8" : "#cbd5e1";
  const sansFont =
    theme === "signal-deck"
      ? "'Manrope', ui-sans-serif, system-ui, sans-serif"
      : "ui-sans-serif, system-ui, sans-serif";
  const monoFont = theme === "signal-deck" ? "'IBM Plex Mono', ui-monospace, monospace" : "ui-monospace, monospace";

  return [
    {
      selector: "node",
      style: {
        label: "data(name)",
        "font-size": 11,
        "font-family": sansFont,
        "font-weight": theme === "signal-deck" ? 700 : 400,
        color: gray700,
        "text-valign": "bottom",
        "text-margin-y": 5,
        "text-max-width": "90px",
        "text-wrap": "ellipsis",
        width: 34,
        height: 34,
        shape: (node: { data: (k: string) => string }) => NODE_SHAPE[node.data("kind")] ?? "ellipse",
        "background-color": (node: { data: (k: string) => string }) => fill[node.data("kind")] ?? fill.Commodity,
        "border-width": 1,
        "border-color": gray300,
      },
    },
    {
      // The subject of the question: bigger, teal, and labelled in white on the
      // node itself rather than beneath it.
      selector: "node[?focus]",
      style: {
        width: 62,
        height: 62,
        "font-size": 12,
        "font-weight": 700,
        "font-family": sansFont,
        "background-color": "#0d9488", // teal-600 — spent on this node alone
        color: "#ffffff",
        "text-valign": "center",
        "text-margin-y": 0,
        "border-width": 3,
        "border-color": "#0f766e", // teal-700
      },
    },
    {
      selector: "edge",
      style: {
        "curve-style": "bezier",
        "target-arrow-shape": "triangle",
        "arrow-scale": 0.8,
        width: "mapData(weight, 0, 1, 1.5, 6)",
        "line-color": lineColor,
        "target-arrow-color": lineColor,
        label: "data(label)",
        "font-size": 9,
        "font-family": monoFont,
        color: gray500,
        "text-background-color": "#ffffff",
        "text-background-opacity": 0.85,
        "text-background-padding": "2px",
        "text-rotation": "autorotate",
      },
    },
    {
      // Classification and coverage are structural, not measured — dashed, so the
      // eye does not read a thin solid line as a small trade flow.
      selector: 'edge[kind = "CLASSIFIED_AS"], edge[kind = "COVERED_BY"]',
      style: { "line-style": "dashed", "target-arrow-shape": "none" },
    },
    {
      selector: "node:selected",
      style: { "border-width": 3, "border-color": "#0d9488" },
    },
    {
      // Everything not adjacent to the selection, faded rather than hidden: the
      // shape of the whole graph stays legible while one path is read.
      selector: ".dimmed",
      style: { opacity: 0.2, "text-opacity": 0.2 },
    },
    {
      selector: "node.expanded",
      style: { "border-color": "#0d9488", "border-style": "dotted", "border-width": 2 },
    },
  ];
}

/**
 * Concentric, not cose. `cose` is force-directed and seeded randomly, so the
 * same answer would draw a different picture on every render — bad for a
 * project whose evaluation set is re-run and compared. Concentric is
 * deterministic, and here it is also the more honest arrangement: the item the
 * question was about sits at the centre and everything else is placed by how
 * directly it relates to it.
 */
export function layoutOptions(animate: boolean): LayoutOptions {
  return {
    name: "concentric",
    concentric: (node: { data: (k: string) => number }) => 10 - node.data("ring"),
    levelWidth: () => 1,
    minNodeSpacing: 42,
    padding: 24,
    animate,
    animationDuration: 300,
    avoidOverlap: true,
    // Sorted by id so nodes land in the same place every time, rather than in
    // whatever order asyncio.gather happened to return the facets in.
    sort: (a: { id: () => string }, b: { id: () => string }) => a.id().localeCompare(b.id()),
  } as unknown as LayoutOptions;
}

/**
 * Place newly-expanded nodes in an arc around the node that was clicked, on the
 * side facing away from the focus.
 *
 * Re-running the global layout instead does two bad things at once: concentric
 * sizes each ring's arc by how many nodes are on it, so three discoveries land
 * in a tight unreadable clump rather than spread around the circle; and every
 * node that was already placed jumps somewhere new, so the picture the user was
 * reading rearranges itself under them. Positioning only the new nodes leaves
 * the rest exactly where it was, and putting them outward keeps them clear of
 * the ring the answer graph already occupies.
 */
export function placeAround(cy: Core, centerId: string, newIds: string[]): void {
  const center = cy.getElementById(centerId);
  if (center.empty() || newIds.length === 0) return;

  const origin = center.position();
  const focus = cy.nodes("[?focus]").first();
  // Away from the focus, or straight up when the clicked node *is* the focus.
  const outward = focus.empty()
    ? -Math.PI / 2
    : Math.atan2(origin.y - focus.position().y, origin.x - focus.position().x);

  const spread = Math.min(Math.PI * 1.2, 0.7 * newIds.length);
  const step = newIds.length > 1 ? spread / (newIds.length - 1) : 0;
  const start = outward - spread / 2;
  const radius = 90 + 14 * newIds.length;

  newIds.forEach((id, index) => {
    const node = cy.getElementById(id);
    if (node.empty()) return;
    const angle = start + step * index;
    node.position({
      x: origin.x + radius * Math.cos(angle),
      y: origin.y + radius * Math.sin(angle),
    });
  });
}

/** Fade everything more than one hop from the selection. */
export function highlightNeighbourhood(cy: Core, nodeId: string | null): void {
  cy.elements().removeClass("dimmed");
  if (!nodeId) return;
  const node = cy.getElementById(nodeId);
  if (node.empty()) return;
  const keep = node.closedNeighborhood();
  cy.elements().difference(keep).addClass("dimmed");
}
