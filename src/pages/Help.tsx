import { useState } from "react";
import { SectionNav } from "../components/ui";
import usePageTitle from "../lib/usePageTitle";

const CATEGORIES = [
  { id: "getting-started", label: "Getting started" },
  { id: "reading", label: "Reading an answer" },
  { id: "chat", label: "Chat & conversations" },
  { id: "news", label: "News & trends" },
  { id: "tools", label: "Other tools" },
  { id: "account", label: "Your account" },
  { id: "admin", label: "Admin" },
] as const;

type Category = "all" | (typeof CATEGORIES)[number]["id"];

const NAV_ITEMS: { id: Category; label: string }[] = [{ id: "all", label: "All" }, ...CATEGORIES];

const FAQS: { q: string; a: string; category: (typeof CATEGORIES)[number]["id"] }[] = [
  {
    q: "What can I ask CeyNex?",
    a: "Questions about Sri Lanka's export performance in tea, cinnamon, and apparel: markets, trends, concentration, and short-term forecasts. Try one of the example questions on the Query page to get started.",
    category: "getting-started",
  },
  {
    q: "What's the difference between Chat and Single question?",
    a: "Chat is the default: a running conversation where you can ask follow-ups, and it's shown side by side with the real reasoning behind each answer. Single question is the original one-box, one-answer form, a click away with the toggle at the top of the Query page. Both give the same grounded answers.",
    category: "getting-started",
  },
  {
    q: "How do I sign in?",
    a: "Sign up for an account from the login page if you don't have one yet, choosing the role that fits you; sign in with it afterward. There's no shared demo login anymore, every account is a real one.",
    category: "getting-started",
  },
  {
    q: "What's different between the roles?",
    a: "Every signed-in account sees the same answers to the same questions; roles differ only in which pages they can reach. You choose Researcher, Exporter, or Policymaker when you sign up; Admin accounts are created separately and are the one role that additionally unlocks the Admin page. The other three have identical access today.",
    category: "getting-started",
  },
  {
    q: "What's the evidence panel next to each answer?",
    a: "Every answer is grounded in specific data points, shown beside the answer rather than hidden behind a button. Each entry names its source and can be expanded to show the underlying query.",
    category: "reading",
  },
  {
    q: "What's the graph diagram beside some answers?",
    a: "The same evidence the panel lists as queries, drawn as a diagram instead: the countries, commodities, and relationships an answer was actually built from. It only appears when an answer's evidence came from the knowledge graph, so its presence is itself a sign of where that answer's figures came from.",
    category: "reading",
  },
  {
    q: "What are the steps shown while an answer is being worked out?",
    a: "The real reasoning trace, not a fake loading animation: which agents ran, the actual Cypher and SQL sent to the databases, and what each model call cost. It stays open afterward so you can check the working behind any answer, not just the figures.",
    category: "reading",
  },
  {
    q: "What does the confidence badge mean?",
    a: "A score from 0 to 1 summarizing how much the answer can be trusted, based on source coverage, data freshness, and how directly the question was answered; never a fixed or hardcoded number. Click it to see the named terms that make it up, not just the total.",
    category: "reading",
  },
  {
    q: "What's the shaded band on a forecast chart?",
    a: "An 80% confidence interval around the projected figure, not just a single point estimate. The forecast could reasonably land anywhere in that shaded range; treat the line through the middle as the best guess, not a guarantee.",
    category: "reading",
  },
  {
    q: "Why does an answer say it's \"degraded\"?",
    a: "When the natural-language reasoning step is unavailable, CeyNex still returns the real figures and evidence behind an answer, just without the written explanation. The figures themselves are never degraded.",
    category: "reading",
  },
  {
    q: "Why did part of my question go unanswered?",
    a: "Some sectors or agents are still being built out. If a question spans more than one, CeyNex answers what it can and says plainly which part it couldn't cover, instead of guessing.",
    category: "reading",
  },
  {
    q: "What's the line above an answer that says \"Trade data through…\"?",
    a: "How current the underlying data is: the latest year covered, how many observations that's built from, and when it was last refreshed. It answers \"is this the latest you have?\" up front, before you have to ask.",
    category: "reading",
  },
  {
    q: "Where does CeyNex's data come from?",
    a: "Sri Lanka's Export Development Board (EDB) and the Joint Apparel Association Forum (JAAF) for apparel, UN Comtrade for cross-sector trade flows, and FAOSTAT for agriculture. Each evidence entry names which one a figure came from. A global news index also feeds the \"Related news\" panel and trending chips, but headlines are shown for context only and never back a figure in an answer.",
    category: "reading",
  },
  {
    q: "Why did CeyNex ask me a question before answering?",
    a: "Occasionally a question is genuinely ambiguous, most often when it names two commodities and answering as though you meant only one would quietly drop the other. CeyNex asks once, rather than guessing; there's always a \"just answer it\" option if you'd rather not choose.",
    category: "chat",
  },
  {
    q: "What are the suggested questions below an answer?",
    a: "Three follow-ups built from the answer itself, the sectors it covered and the parts it couldn't, not written by a model. Click one to ask it, or ignore them and type your own follow-up instead.",
    category: "chat",
  },
  {
    q: "Can I get a fresh answer to the same question?",
    a: "Yes, in Chat: Regenerate re-runs your latest question and streams a new answer in its place. The previous answer isn't lost, a version switcher lets you flip back to it.",
    category: "chat",
  },
  {
    q: "Can I share a conversation?",
    a: "Yes. Share creates a read-only link anyone can open without signing in, showing the conversation as it stood at that moment. It won't update if you keep chatting afterward.",
    category: "chat",
  },
  {
    q: "Can I save a conversation somewhere else?",
    a: "Export downloads the whole conversation as a Markdown file, questions, answers, and their evidence included, so you can keep or paste it elsewhere.",
    category: "chat",
  },
  {
    q: "What do the thumbs on an answer do?",
    a: "They flag whether an answer was right, which feeds back into how CeyNex is evaluated over time. A thumbs-down also asks what was wrong, which is more useful than a plain \"bad answer\" and helps prioritize real fixes.",
    category: "chat",
  },
  {
    q: "What happens to my past chats?",
    a: "Every conversation you have signed in is saved automatically and listed in the sidebar, most recent first. From there you can reopen one, rename it, pin it to the top, or delete it. Nobody else can see your chats; they're scoped to your account.",
    category: "chat",
  },
  {
    q: "What's the \"Related news\" panel beside an answer?",
    a: "Recent news headlines about the same topic, shown for context, not as proof. It's ranked closely related, related, or loosely related to your question, but a headline never backs a figure in the answer above it the way an evidence entry does.",
    category: "news",
  },
  {
    q: "What are the headline chips above the search box?",
    a: "Trending trade and economy topics, refreshed from recent news coverage, shown in Single question mode. Clicking one fills in a related question for you; it doesn't run the headline itself as a search.",
    category: "news",
  },
  {
    q: "What's the scenario workbench?",
    a: "A page for testing a rupee depreciation, a new tariff, or the loss of a trade preference against sliders instead of a typed question, using the same formulas and baseline data as an answer built from asking about one directly. Every parameter shows where it came from, including the ones still marked as unsourced placeholders, rather than dressing up a guess as a fitted number.",
    category: "tools",
  },
  {
    q: "What are custom answer instructions, on my Account page?",
    a: "A standing preference for how answers should read, for example shorter, or in a particular tone. It only changes wording and format: it can't make CeyNex state a figure its sources don't support, change which analyses run, or turn off the grounding check.",
    category: "tools",
  },
  {
    q: "What's the Usage and limits section of my Account page?",
    a: "What your account has actually spent on model calls recently, day by day, and the limits that apply to you, disclosed up front rather than only discovered when you hit one. If your daily budget runs out, answers keep coming with their figures and evidence intact, just without the written explanation.",
    category: "tools",
  },
  {
    q: "What's the \"Recent queries\" list, in Single question mode?",
    a: "Every question you ask while signed in is saved to your own history automatically, most recent first. Click any entry to load that question back into the search box.",
    category: "account",
  },
  {
    q: "Can I save a question for later?",
    a: "Yes, in Single question mode: click the star (☆) next to any entry in Recent queries to bookmark it, and switch the All / Saved toggle above the list to see just your starred ones. Saving doesn't re-run the question, it just marks that entry for easy access later.",
    category: "account",
  },
  {
    q: "What do the notification preferences on my Account page do?",
    a: "They record what you'd want to be notified about, once a delivery channel exists for it. CeyNex doesn't send email or push notifications yet, so saving a preference stores your choice for later rather than triggering anything today.",
    category: "account",
  },
  {
    q: "What are API keys for?",
    a: "Programmatic access to the query API from outside the browser, for anyone scripting or integrating against CeyNex directly. A key authenticates the same way your login token does. The full key is shown once, right after you create it; only its prefix is shown afterward, and revoking a key stops it working immediately.",
    category: "account",
  },
  {
    q: "What can an Admin do that other roles can't?",
    a: "The Admin page shows live system status (Postgres, Neo4j, LLM reasoning), lists registered forecast models with a one-click retrain, triggers data ingestion from EDB/JAAF or UN Comtrade, and lists data-quality flags with a resolve action, plus user management and an activity log. These are real actions against the live system, restricted to the Admin role on the backend, not just hidden in the menu.",
    category: "admin",
  },
];

export default function Help() {
  usePageTitle("Help & FAQ");
  const [category, setCategory] = useState<Category>("all");
  const shown = category === "all" ? FAQS : FAQS.filter((f) => f.category === category);

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-xl font-bold text-gray-900 mb-1">Help &amp; FAQ</h1>
        <p className="text-sm text-gray-500 mb-4">
          A quick guide to how CeyNex answers questions.
        </p>

        <SectionNav section={category} onChange={setCategory} items={NAV_ITEMS} ariaLabel="Help categories" />

        {/* A question-and-answer list is exactly what <dl>/<dt>/<dd> are for --
         * real semantics instead of <div>s styled to look like one, so a
         * screen reader can navigate the FAQ by term rather than reading an
         * undifferentiated stream of paragraphs. */}
        <dl className="space-y-3 mt-4">
          {shown.map(({ q, a }) => (
            <div key={q} className="cx-panel-flat p-5">
              <dt className="text-sm font-bold text-gray-900 mb-1.5">{q}</dt>
              <dd className="text-sm text-gray-600 leading-relaxed">{a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
