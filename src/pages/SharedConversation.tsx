/**
 * A read-only conversation, to anyone holding the link (execution plan §5).
 *
 * **Deliberately outside `RequireAuth`.** SRS 3.1.11 requires an account before
 * *submitting a query*; reading a transcript someone chose to share is not that,
 * and requiring an account would remove the only reason the feature exists —
 * showing a reader exactly what the system did, without asking them to sign up
 * first. There is no composer on this page and no way to ask anything from it.
 *
 * The transcript carries no identity: the backend never selects `user_email`.
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AssistantTurn, UserTurn } from "../components/ChatMessage";
import { ErrorBanner, Skeleton } from "../components/ui";
import { apiFetch } from "../lib/apiFetch";
import usePageTitle from "../lib/usePageTitle";
import type { ChatMessage } from "../types/chat";

interface Shared {
  title: string | null;
  created_at: string;
  messages: ChatMessage[];
}

export default function SharedConversation() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Shared | null>(null);
  const [error, setError] = useState<string | null>(null);
  usePageTitle(data?.title ? `${data.title} — shared` : "Shared conversation");

  useEffect(() => {
    if (!token) return;
    let live = true;
    apiFetch<Shared>(`/api/chat/shared/${token}`)
      .then((value) => live && setData(value))
      .catch(() =>
        live &&
        setError("That link is no longer valid. The person who shared it may have revoked it."),
      );
    return () => {
      live = false;
    };
  }, [token]);

  if (error) return <ErrorBanner>{error}</ErrorBanner>;
  if (!data) return <Skeleton />;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-gray-900">
          {data.title || "CeyNex conversation"}
        </h1>
        <p className="text-sm text-gray-500">
          A read-only copy of a CeyNex analysis, including the evidence behind every figure.
        </p>
      </header>

      <ol className="space-y-6">
        {data.messages.map((message) =>
          message.role === "user" ? (
            <UserTurn key={message.seq} content={message.content} />
          ) : (
            <AssistantTurn
              key={message.seq}
              graphKey={`shared-${message.seq}`}
              mode={message.mode}
              events={[]}
              running={false}
              answer={{
                answer: message.content,
                confidence: message.confidence ?? null,
                confidence_band: message.confidence_band ?? null,
                agents_used: message.agents_used,
                evidence: message.evidence,
                forecast: message.forecast,
                graph: message.graph,
                degraded: message.degraded ?? false,
                route: message.route,
                sectors: message.sectors,
                unanswered: message.unanswered,
                elapsed_ms: message.elapsed_ms,
              }}
            />
          ),
        )}
      </ol>
    </div>
  );
}
