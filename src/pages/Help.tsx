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
    q: "What does the confidence badge mean?",
    a: "A score from 0 to 1 summarizing how much the answer can be trusted, based on source coverage, data freshness, and how directly the question was answered; never a fixed or hardcoded number.",
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
    q: "Where does CeyNex's data come from?",
    a: "Sri Lanka's Export Development Board (EDB) and the Joint Apparel Association Forum (JAAF) for apparel, UN Comtrade for cross-sector trade flows, and FAOSTAT for agriculture. Each evidence entry names which one a figure came from.",
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
    q: "What can an Admin do that other roles can't?",
    a: "The Admin page shows live system status (Postgres, Neo4j, LLM reasoning), lists registered forecast models with a one-click retrain, triggers data ingestion from EDB/JAAF or UN Comtrade, and lists data-quality flags with a resolve action. These are real actions against the live system, restricted to the Admin role on the backend, not just hidden in the menu.",
  },
];

export default function Help() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Help &amp; FAQ</h1>
        <p className="text-sm text-gray-500 mb-6">
          A quick guide to how CeyNex answers questions.
        </p>

        <div className="space-y-3">
          {FAQS.map(({ q, a }) => (
            <div key={q} className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="text-sm font-medium text-gray-900 mb-1.5">{q}</div>
              <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
