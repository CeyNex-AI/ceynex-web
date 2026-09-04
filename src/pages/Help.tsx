import usePageTitle from "../lib/usePageTitle";

const FAQS = [
  {
    q: "What can I ask CeyNex?",
    a: "Questions about Sri Lanka's export performance in tea, cinnamon, and apparel: markets, trends, concentration, and short-term forecasts. Try one of the example queries on the Query page to get started.",
  },
  {
    q: "What's the evidence panel next to each answer?",
    a: "Every answer is grounded in specific data points, shown beside the answer rather than hidden behind a button. Each entry names its source and can be expanded to show the underlying query.",
  },
  {
    q: "What's the graph diagram beside some answers?",
    a: "The same evidence the panel lists as queries, drawn as a diagram instead: the countries, commodities, and relationships an answer was actually built from. It only appears when an answer's evidence came from the knowledge graph, so its presence is itself a sign of where that answer's figures came from.",
  },
  {
    q: "What does the confidence badge mean?",
    a: "A score from 0 to 1 summarizing how much the answer can be trusted, based on source coverage, data freshness, and how directly the question was answered; never a fixed or hardcoded number.",
  },
  {
    q: "What's the shaded band on a forecast chart?",
    a: "An 80% confidence interval around the projected figure, not just a single point estimate. The forecast could reasonably land anywhere in that shaded range; treat the line through the middle as the best guess, not a guarantee.",
  },
  {
    q: "Why does an answer say it's \"degraded\"?",
    a: "When the natural-language reasoning step is unavailable, CeyNex still returns the real figures and evidence behind an answer, just without the written explanation. The figures themselves are never degraded.",
  },
  {
    q: "Why did part of my question go unanswered?",
    a: "Some sectors or agents are still being built out. If a question spans more than one, CeyNex answers what it can and says plainly which part it couldn't cover, instead of guessing.",
  },
  {
    q: "What's the \"Related coverage\" panel below an answer?",
    a: "Recent news headlines about the same topic, shown for context, not as proof. It's ranked closely related, related, or loosely related to your question, but a headline never backs a figure in the answer above it the way an evidence entry does.",
  },
  {
    q: "What are the headline chips above the search box?",
    a: "Trending trade and economy topics, refreshed from recent news coverage. Clicking one fills in a related question for you; it doesn't run the headline itself as a search.",
  },
  {
    q: "Where does CeyNex's data come from?",
    a: "Sri Lanka's Export Development Board (EDB) and the Joint Apparel Association Forum (JAAF) for apparel, UN Comtrade for cross-sector trade flows, and FAOSTAT for agriculture. Each evidence entry names which one a figure came from. A global news index also feeds the \"Related coverage\" panel and trending chips above, but headlines are shown for context only and never back a figure in an answer.",
  },
  {
    q: "How do I sign in?",
    a: "CeyNex uses four fixed demo accounts, one per role (policymaker@ceynex.dev, admin@ceynex.dev, researcher@ceynex.dev, exporter@ceynex.dev), all sharing the password ceynex-demo. The login page's role buttons fill in an account for you; there's no self-service sign-up.",
  },
  {
    q: "What's different between the four roles?",
    a: "Every signed-in account sees the same answers to the same questions; the roles differ only in which pages they can reach. Admin is the one role that unlocks the Admin page (see below); Policymaker, Researcher, and Exporter otherwise have identical access today.",
  },
  {
    q: "What's the \"Recent queries\" list on the Query page?",
    a: "Every question you ask while signed in is saved to your own history automatically, most recent first. Click any entry to load that question back into the search box. Nobody else can see your history; it's scoped to your account.",
  },
  {
    q: "Can I save a question for later?",
    a: "Yes. Click the star (☆) next to any entry in Recent queries to bookmark it, and switch the All / Saved toggle above the list to see just your starred ones. Saving doesn't re-run the question, it just marks that entry for easy access later.",
  },
  {
    q: "What do the notification preferences on my Account page do?",
    a: "They record what you'd want to be notified about, once a delivery channel exists for it. CeyNex doesn't send email or push notifications yet, so saving a preference stores your choice for later rather than triggering anything today.",
  },
  {
    q: "What are API keys for?",
    a: "Programmatic access to the query API from outside the browser, for anyone scripting or integrating against CeyNex directly. A key authenticates the same way your login token does. The full key is shown once, right after you create it; only its prefix is shown afterward, and revoking a key stops it working immediately.",
  },
  {
    q: "What can an Admin do that other roles can't?",
    a: "The Admin page shows live system status (Postgres, Neo4j, LLM reasoning), lists registered forecast models with a one-click retrain, triggers data ingestion from EDB/JAAF or UN Comtrade, and lists data-quality flags with a resolve action. These are real actions against the live system, restricted to the Admin role on the backend, not just hidden in the menu.",
  },
];

export default function Help() {
  usePageTitle("Help & FAQ");
  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Help &amp; FAQ</h1>
        <p className="text-sm text-gray-500 mb-6">
          A quick guide to how CeyNex answers questions.
        </p>

        {/* A question-and-answer list is exactly what <dl>/<dt>/<dd> are for --
         * real semantics instead of <div>s styled to look like one, so a
         * screen reader can navigate the FAQ by term rather than reading an
         * undifferentiated stream of paragraphs. */}
        <dl className="space-y-3">
          {FAQS.map(({ q, a }) => (
            <div key={q} className="bg-white border border-gray-200 rounded-lg p-5">
              <dt className="text-sm font-medium text-gray-900 mb-1.5">{q}</dt>
              <dd className="text-sm text-gray-600 leading-relaxed">{a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
