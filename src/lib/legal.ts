/**
 * The legal wording the SRS asks the web application to display (SRS
 * "Licensing, Legal, Copyright, and Other Notices": LG-01 disclaimer, LG-07
 * copyright). Kept in one module so the footer, the line under each answer, the
 * Markdown export and the Notices page cannot drift apart.
 */

export const COPYRIGHT_NOTICE = "© 2026 CeyNex, Group 07, University of Moratuwa";

/** The site-wide statement: not advice, and no warranty. */
export const SITE_DISCLAIMER =
  "CeyNex's answers, forecasts and confidence scores come from the cited data and models. " +
  "They are for information only, not financial, legal, investment or official policy advice, " +
  "and are provided as is, without warranty.";

/** Under each analysed answer, where a figure is actually read. */
export const ANSWER_DISCLAIMER =
  "An estimate from the cited data and models, for information only. Not financial, legal, investment or policy advice.";

/** Under a scenario result, which comes from stated assumptions rather than from data alone. */
export const SCENARIO_DISCLAIMER =
  "A what-if estimate from the stated assumptions, not a forecast. For information only, not advice.";
