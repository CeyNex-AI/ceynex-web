import { useCallback, useEffect, useRef, useState } from "react";
import cytoscape, { type Core, type NodeSingular } from "cytoscape";
import { expandNode } from "../lib/graphApi";
import {
  EXPANDED_RING,
  buildStylesheet,
  highlightNeighbourhood,
  layoutOptions,
  placeAround,
  relationshipLabel,
  toElements,
} from "../lib/graphStyle";
import { useTheme } from "../lib/useTheme";
import type { AnswerGraph, GraphNode } from "../types/contracts";

/**
 * SRS 3.1.4 and 3.1.6 — the knowledge graph behind an answer, drawn.
 *
 * `EvidencePanel` already shows the Cypher that produced each figure, which
 * makes "this was answered from the graph" checkable by anyone who reads
 * Cypher. This is the same claim for everyone else. The two are complementary
 * and both stay: the queries are the machine-level provenance the frozen
 * `Evidence` contract exists to carry, and this is what the relationships
 * actually look like.
 *
 * Rendered only when the backend sent a graph, which it does only for an answer
 * whose evidence actually came from the KG (see `_answer_graph` in
 * ceynex/api/routes/query.py) — so the panel's presence is itself a provenance
 * statement, and there is no "no graph available" empty state to render.
 *
 * Cytoscape is driven directly through a ref rather than through
 * react-cytoscapejs: that wrapper is a stale class component, and one effect
 * with an explicit teardown is both smaller and easier to reason about against
 * React 19's stricter mount semantics.
 *
 * **The caller must pass a `key` that changes per answer.** Everything here —
 * which nodes have been expanded, what is selected, the camera — belongs to one
 * question, and remounting is how React resets all of it at once. Doing it with
 * an effect that calls setState on a new `graph` prop instead would reset the
 * React state but not cytoscape's own, and would cascade a second render on
 * every answer.
 */
export default function KnowledgeGraphPanel({ graph }: { graph: AnswerGraph }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const expandedRef = useRef<Set<string>>(new Set());
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [expanding, setExpanding] = useState<string | null>(null);
  const [expandError, setExpandError] = useState<string | null>(null);
  const [showQueries, setShowQueries] = useState(false);
  const [counts, setCounts] = useState({
    nodes: graph.nodes.length,
    edges: graph.edges.length,
  });

  const handleExpand = useCallback(async (node: NodeSingular) => {
    const id = node.id();
    const cy = cyRef.current;
    if (!cy || expandedRef.current.has(id)) return;

    expandedRef.current.add(id);
    setExpanding(id);
    setExpandError(null);
    try {
      const fragment = await expandNode(id);
      if (!cyRef.current) return; // unmounted while the request was in flight

      // Only what the canvas does not already hold. cy.add() on an existing id
      // throws, and re-adding an existing node would also reset its position.
      const additions = toElements(fragment.nodes, fragment.edges)
        .filter((element) => cy.getElementById(element.data.id as string).empty())
        .map((element) =>
          element.group === "nodes"
            ? // Overrides the label's own ring. A discovered Commodity is ring 0
              // by that table -- the focus item's ring -- and would be treated
              // as belonging in the middle. Here "further from the question" is
              // what the ring means, not what kind of thing the node is.
              { ...element, data: { ...element.data, ring: EXPANDED_RING } }
            : element,
        );
      if (additions.length > 0) {
        cy.add(additions);
        placeAround(
          cy,
          id,
          additions.filter((e) => e.group === "nodes").map((e) => e.data.id as string),
        );
        // Plain fit rather than cy.animate({fit}) -- the animated form was not
        // applying the padding, leaving the outermost nodes sitting half off
        // the top edge. Padding is generous because cytoscape fits to node
        // boxes and the label is drawn outside that box.
        cy.fit(cy.elements(), 52);
      }
      cy.getElementById(id).addClass("expanded");
      setCounts({ nodes: cy.nodes().length, edges: cy.edges().length });
    } catch {
      // The click failed; let it be tried again rather than leaving the node
      // permanently marked as explored.
      expandedRef.current.delete(id);
      setExpandError("Couldn't load that node's connections.");
    } finally {
      setExpanding((current) => (current === id ? null : current));
    }
  }, []);

  const { theme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: toElements(graph.nodes, graph.edges),
      style: buildStylesheet(theme),
      layout: layoutOptions(false),
      // Zoom bounds rather than free scroll: past these the drawing is either
      // one enormous circle or an unreadable speck, and both look like a bug.
      minZoom: 0.3,
      maxZoom: 2.5,
      wheelSensitivity: 0.2,
    });

    cy.on("tap", "node", (event) => {
      const node = event.target as NodeSingular;
      setSelected({
        id: node.id(),
        label: node.data("kind"),
        name: node.data("name"),
        properties: (node.data("properties") ?? {}) as Record<string, unknown>,
        focus: Boolean(node.data("focus")),
      });
      highlightNeighbourhood(cy, node.id());
      void handleExpand(node);
    });

    // Tapping the background clears the selection, the way clicking outside a
    // list clears it -- otherwise the only way back to the whole graph is to
    // find and re-tap the node that is already selected.
    cy.on("tap", (event) => {
      if (event.target === cy) {
        setSelected(null);
        highlightNeighbourhood(cy, null);
      }
    });

    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [graph, handleExpand, theme]);

  return (
    <div className="cx-panel p-4">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 className="cx-panel-title">Knowledge graph</h2>
        <span className="text-xs text-gray-400">
          {counts.nodes} nodes · {counts.edges} connections
          {graph.truncated && " · showing the largest"}
        </span>
      </div>

      <p className="print:hidden text-xs text-gray-400 mb-2">
        Click a node to trace its connections and pull in its neighbours. Drag to pan,
        scroll to zoom.
      </p>

      {/* Same treatment ForecastChart gives its Recharts SVG, for a stronger
          reason: cytoscape renders to a <canvas>, which a screen reader cannot
          see at all and which prints as a blank rectangle. Hidden from both,
          with the table below standing in for both. */}
      <div
        ref={containerRef}
        aria-hidden="true"
        className="print:hidden w-full h-[440px] rounded-md bg-gray-50 border border-gray-100"
      />

      {expandError && (
        <p role="status" className="print:hidden mt-2 text-xs text-amber-600">
          {expandError}
        </p>
      )}

      {selected && (
        <NodeDetail node={selected} loading={expanding === selected.id} />
      )}

      <Legend types={[...new Set(graph.edges.map((edge) => edge.type))]} />

      {/* The real text equivalent of the canvas, for a screen reader and for
          the printed report the "Print report" button produces -- sr-only on
          screen, visible on paper. */}
      <table className="sr-only print:not-sr-only print:mt-3 print:w-full print:text-xs">
        <caption className="print:text-left print:font-semibold print:mb-1">
          The knowledge-graph relationships behind this answer
        </caption>
        <thead>
          <tr>
            <th scope="col" className="print:text-left">From</th>
            <th scope="col" className="print:text-left">Relationship</th>
            <th scope="col" className="print:text-left">To</th>
            <th scope="col" className="print:text-left">Value</th>
          </tr>
        </thead>
        <tbody>
          {graph.edges.map((edge) => (
            <tr key={edge.id}>
              <td>{nameOf(graph, edge.source)}</td>
              <td>{relationshipLabel(edge.type)}</td>
              <td>{nameOf(graph, edge.target)}</td>
              <td>{edge.label ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {graph.queries.length > 0 && (
        <div className="print:hidden mt-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowQueries((s) => !s)}
            aria-expanded={showQueries}
            className="text-xs text-teal-600 hover:text-teal-800 underline underline-offset-2"
          >
            {showQueries ? "Hide the queries behind this graph" : "Show the queries behind this graph"}
          </button>
          {showQueries && (
            <div className="mt-2 space-y-2">
              {graph.queries.map((cypher) => (
                <pre
                  key={cypher}
                  className="text-[11px] leading-snug bg-gray-900 text-gray-100 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words"
                >
                  {cypher}
                </pre>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NodeDetail({ node, loading }: { node: GraphNode; loading: boolean }) {
  const entries = Object.entries(node.properties).filter(([, value]) => value != null);
  return (
    <div className="print:hidden mt-3 rounded-md border border-gray-100 bg-gray-50 p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-mono font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
          {node.label}
        </span>
        <span className="text-sm font-medium text-gray-900">{node.name}</span>
        {loading && <span className="text-xs text-gray-400">loading connections…</span>}
      </div>
      {entries.length > 0 && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
          {entries.map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-gray-400">{key}</dt>
              <dd className="text-gray-600">{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function Legend({ types }: { types: string[] }) {
  if (types.length === 0) return null;
  return (
    <ul className="print:hidden mt-3 flex flex-wrap gap-x-4 gap-y-1">
      {types.map((type) => (
        <li key={type} className="flex items-center gap-1.5 text-xs text-gray-500">
          <span
            aria-hidden="true"
            className={`inline-block w-4 border-t-2 ${
              type === "CLASSIFIED_AS" || type === "COVERED_BY"
                ? "border-dashed border-gray-300"
                : "border-gray-400"
            }`}
          />
          {relationshipLabel(type)}
        </li>
      ))}
    </ul>
  );
}

/** Nodes added by an expansion are not in `graph`, so the table falls back to
 * the id — which is `Label:key` and still readable. */
function nameOf(graph: AnswerGraph, id: string): string {
  return graph.nodes.find((node) => node.id === id)?.name ?? id;
}
