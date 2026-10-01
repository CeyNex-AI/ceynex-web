import { ANSWER_DISCLAIMER, SCENARIO_DISCLAIMER } from "../lib/legal";

/**
 * One line of small print under an answer or a scenario result (SRS LG-01),
 * where a reader actually takes a figure away. The site footer says the same
 * at length, but a footer is easy to scroll past.
 *
 * Plain text: no `role="status"` or live region. The answer already announces
 * itself, and scenario.spec.ts and a11y.spec.ts find the page's one status
 * region with a strict `getByRole("status")`, which a second one would break.
 */
export default function AnswerDisclaimer({
  kind = "answer",
  className = "",
}: {
  kind?: "answer" | "scenario";
  className?: string;
}) {
  return (
    <p className={`text-xs text-gray-500 ${className}`}>
      {kind === "scenario" ? SCENARIO_DISCLAIMER : ANSWER_DISCLAIMER}
    </p>
  );
}
