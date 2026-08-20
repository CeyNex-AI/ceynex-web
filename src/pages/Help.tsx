const FAQS = [
  {
    q: "What can I ask CeyNex?",
    a: "Questions about Sri Lanka's export performance in tea, cinnamon, and apparel — markets, trends, concentration, and short-term forecasts. Try one of the example queries on the Query page to get started.",
  },
  {
    q: "What's the evidence panel next to each answer?",
    a: "Every answer is grounded in specific data points, shown beside the answer rather than hidden behind a button. Each entry names its source and can be expanded to show the underlying query.",
  },
  {
    q: "What does the confidence badge mean?",
    a: "A score from 0 to 1 summarizing how much the answer can be trusted, based on source coverage, data freshness, and how directly the question was answered — never a fixed or hardcoded number.",
  },
  {
    q: "Why does an answer say it's \"degraded\"?",
    a: "When the natural-language reasoning step is unavailable, CeyNex still returns the real figures and evidence behind an answer, just without the written explanation. The figures themselves are never degraded.",
  },
  {
    q: "Why did part of my question go unanswered?",
    a: "Some sectors or agents are still being built out. If a question spans more than one, CeyNex answers what it can and says plainly which part it couldn't cover, instead of guessing.",
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
