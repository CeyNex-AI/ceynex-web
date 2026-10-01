/**
 * Notices: the disclaimer, data attribution, usage limits, copyright and
 * open-source notices the SRS asks the web application to carry ("Licensing,
 * Legal, Copyright, and Other Notices"; LG-01 to LG-07).
 *
 * Public, outside RequireAuth, because the footer links here from the sign-in
 * pages too, and terms a visitor can only read after signing up are terms they
 * never saw.
 *
 * The source list is what CeyNex may cite as evidence. Each answer's evidence
 * panel names the actual source and period behind each figure; this page is
 * where the publishers and their terms are credited.
 */

import type { ReactNode } from "react";
import { COPYRIGHT_NOTICE } from "../lib/legal";
import usePageTitle from "../lib/usePageTitle";

interface DataSource {
  name: string;
  publisher: string;
  url: string;
  use: string;
  terms: ReactNode;
}

const DATA_SOURCES: DataSource[] = [
  {
    name: "UN Comtrade",
    publisher: "United Nations Statistics Division",
    url: "https://comtradeplus.un.org/",
    use: "Sri Lanka's exports by product and partner country.",
    terms: (
      <>
        Data © United Nations. CeyNex is a free, non-commercial analytical application: it shows
        figures derived from this data in answers and offers no raw-data download, as the UNSD policy
        on the use and re-dissemination of UN Comtrade data provides for.
      </>
    ),
  },
  {
    name: "FAOSTAT",
    publisher: "Food and Agriculture Organization of the United Nations",
    url: "https://www.fao.org/faostat/",
    use: "Agricultural production, export volumes and producer prices.",
    terms: (
      <>
        Licensed under{" "}
        <ExternalLink href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</ExternalLink> and the{" "}
        <ExternalLink href="https://www.fao.org/contact-us/terms/db-terms-of-use">
          FAO Statistical Database Terms of Use
        </ExternalLink>
        .
      </>
    ),
  },
  {
    name: "Commodity Price Data (the Pink Sheet)",
    publisher: "World Bank",
    url: "https://www.worldbank.org/en/research/commodity-markets",
    use: "Monthly world prices for tea, rubber and coconut oil.",
    terms: (
      <>
        Licensed under <ExternalLink href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</ExternalLink>.
      </>
    ),
  },
  {
    name: "World Development Indicators",
    publisher: "World Bank",
    url: "https://data.worldbank.org/indicator/PA.NUS.FCRF",
    use: "The official LKR/USD exchange rate.",
    terms: (
      <>
        Licensed under <ExternalLink href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</ExternalLink>.
      </>
    ),
  },
  {
    name: "Export statistics",
    publisher: "Sri Lanka Export Development Board (EDB)",
    url: "https://www.srilankabusiness.com/",
    use: "Export values by product and market.",
    terms: "Published statistics, credited to the EDB wherever they are cited.",
  },
  {
    name: "Apparel export data",
    publisher: "Joint Apparel Association Forum Sri Lanka (JAAF)",
    url: "https://srilankaapparel.com/data-center/",
    use: "Monthly apparel exports, in total and by market.",
    terms: "Published statistics, credited to JAAF wherever they are cited.",
  },
  {
    name: "Tea export volumes",
    publisher: "Central Bank of Sri Lanka, Tea Exporters Association and Sri Lanka Tea Board",
    url: "https://www.cbsl.gov.lk/",
    use: "Annual tea export volumes: Central Bank tables for 2011 to 2016, Tea Exporters Association tables from 2017.",
    terms: "Published statistics, credited to their publishers wherever they are cited.",
  },
  {
    name: "Cinnamon export volumes",
    publisher: "Department of Export Agriculture (DEA)",
    url: "https://www.dea.gov.lk/",
    use: "Annual cinnamon export volumes.",
    terms: "Published statistics, credited to the DEA wherever they are cited.",
  },
  {
    name: "News headlines",
    publisher: "The GDELT Project",
    url: "https://www.gdeltproject.org/",
    use: "Recent headlines shown beside an answer. Never used as evidence for a figure.",
    terms: "Open data, used with a citation and a link back, as GDELT's terms ask.",
  },
  {
    name: "Web results",
    publisher: "Each page's own publisher, found through a web search service",
    url: "https://tavily.com/",
    use: "Recent pages shown as labelled web results, each linked to its source. Never used for a figure or for the confidence score.",
    terms: "The content belongs to its publishers. CeyNex shows a short excerpt and the link.",
  },
];

const SERVER_SOFTWARE: [string, string][] = [
  ["PostgreSQL", "PostgreSQL License"],
  ["Neo4j Community Edition", "GPL-3.0"],
  ["APOC (Neo4j procedures)", "Apache-2.0"],
  ["Redis", "RSALv2, SSPLv1 or AGPL-3.0"],
  ["Qdrant", "Apache-2.0"],
  ["nginx", "BSD-2-Clause"],
  ["FastAPI", "MIT"],
  ["Starlette, Uvicorn, HTTPX", "BSD-3-Clause"],
  ["LangGraph, LangChain Core, Pydantic", "MIT"],
  ["OpenAI Python library", "Apache-2.0"],
  ["Neo4j Python driver", "Apache-2.0"],
  ["psycopg", "LGPL-3.0"],
  ["Qdrant client, FastEmbed, PyArrow, bcrypt", "Apache-2.0"],
  ["pandas, NumPy, scikit-learn, statsmodels", "BSD-3-Clause"],
  ["LightGBM, PyJWT, redis-py, openpyxl, pdfplumber, Beautiful Soup", "MIT"],
];

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-teal-700 hover:text-teal-800 underline underline-offset-2"
    >
      {children}
    </a>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="cx-panel-flat p-5 space-y-3">
      <h2 id={id} className="text-base font-bold text-gray-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Notices() {
  usePageTitle("Notices");

  return (
    <div className="flex-1 bg-gray-50 p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 mb-1.5 tracking-tight">Notices</h1>
          <p className="text-sm text-gray-500">
            What CeyNex's answers are and are not, where its data comes from, and the software it is
            built with.
          </p>
        </div>

        <Section id="notice-advice" title="Not advice">
          <p className="text-sm text-gray-600 leading-relaxed">
            CeyNex's forecasts, confidence scores and recommendations are generated from available data
            and modelling techniques. They do not constitute financial, legal, investment or official
            government policy advice. A forecast is an estimate, not a guaranteed outcome, and CeyNex shows
            each one with its confidence interval.
          </p>
        </Section>

        <Section id="notice-warranty" title="No warranty">
          <p className="text-sm text-gray-600 leading-relaxed">
            The software and its outputs are provided as is, without warranty of any kind as to
            accuracy, completeness or fitness for a particular purpose. This is without prejudice to any
            service level agreed separately with an organisation that deploys CeyNex.
          </p>
        </Section>

        <Section id="notice-data" title="Data sources">
          <p className="text-sm text-gray-600 leading-relaxed">
            Figures in answers come from the sources below, not from CeyNex itself. The evidence beside
            each answer names the source and period behind every figure.
          </p>
          <dl className="space-y-4">
            {DATA_SOURCES.map((source) => (
              <div key={source.name} className="text-sm">
                <dt className="font-semibold text-gray-900">
                  <ExternalLink href={source.url}>{source.name}</ExternalLink>
                  <span className="font-normal text-gray-500">, {source.publisher}</span>
                </dt>
                <dd className="text-gray-600 leading-relaxed">{source.use}</dd>
                <dd className="text-gray-500 leading-relaxed">{source.terms}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section id="notice-limits" title="Usage limits">
          <p className="text-sm text-gray-600 leading-relaxed">
            Using CeyNex requires a signed-in account. Questions, chat turns, news searches and scenario
            runs are each rate-limited per user, and language-model spending is capped per user and for
            the whole deployment each day. When a cap is reached, a fallback model may write the
            explanation; if none is available, the answer keeps its figures and evidence without one.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            Your current limits and today's usage are listed on the Account page, under Usage. API
            keys are for your own questions within the same limits. Bulk extraction of the knowledge
            graph or the underlying dataset is not permitted.
          </p>
        </Section>

        <Section id="notice-copyright" title="Copyright">
          <p className="text-sm text-gray-600 leading-relaxed">
            {COPYRIGHT_NOTICE}. The CeyNex name, interface design and original documentation are the work
            of the project team. Third-party data and software remain the property of their owners, under
            the terms listed on this page.
          </p>
        </Section>

        <Section id="notice-software" title="Open-source software">
          <p className="text-sm text-gray-600 leading-relaxed">
            The web application bundles open-source packages whose licences require their notices to
            travel with them; the full list, with each licence text, is in{" "}
            <ExternalLink href="/third-party-licenses.txt">third-party-licenses.txt</ExternalLink>. The
            server side runs on the following:
          </p>
          <div>
            <table className="w-full text-sm">
              <caption className="sr-only">Server-side open-source components and their licences</caption>
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                  <th scope="col" className="py-2 pr-4 font-medium">Component</th>
                  <th scope="col" className="py-2 font-medium">Licence</th>
                </tr>
              </thead>
              <tbody>
                {SERVER_SOFTWARE.map(([component, licence]) => (
                  <tr key={component} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-4 text-gray-800">{component}</td>
                    <td className="py-2 text-gray-600">{licence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  );
}
