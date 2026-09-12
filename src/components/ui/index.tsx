/**
 * The class strings this codebase already agrees on, in one place.
 *
 * Nothing here is new design. The card shell was hand-repeated verbatim in
 * twelve files, the primary button in five with small drifts, and the pill in
 * four. The conversational layer adds roughly ten more components; extracting
 * first is the difference between one convention and a thirteenth copy of it.
 *
 * Deliberately thin — plain function components over Tailwind utilities, no
 * variant library, no `cn()` helper, no polymorphic `as` prop. The palette
 * (teal-600 accent, gray neutrals) and the a11y habits (`role="alert"`,
 * `aria-pressed`, visible focus rings) are lifted from the existing files
 * rather than invented.
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "aside" | "article";
}) {
  return (
    <Tag className={`bg-white border border-gray-200 rounded-lg ${className}`}>{children}</Tag>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

const BUTTON_VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-teal-700 hover:bg-teal-800 disabled:bg-gray-300 text-white",
  secondary:
    "bg-white border border-gray-300 hover:bg-gray-50 disabled:text-gray-400 text-gray-700",
  ghost: "text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:text-gray-300",
  danger: "text-red-700 hover:bg-red-50 disabled:text-gray-300",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  const sizing = size === "sm" ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm";
  return (
    <button
      type={type}
      className={
        `${BUTTON_VARIANTS[variant]} ${sizing} font-medium rounded-md ` +
        `disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 ` +
        `focus-visible:outline-teal-600 transition-colors ${className}`
      }
      {...rest}
    />
  );
}

export function Pill({
  children,
  tone = "gray",
  className = "",
}: {
  children: ReactNode;
  tone?: "gray" | "teal" | "amber" | "red";
  className?: string;
}) {
  const tones = {
    gray: "bg-gray-100 text-gray-700",
    teal: "bg-teal-50 text-teal-700",
    amber: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * `role="alert"` because an error that appears after a failed action has to be
 * announced — the boxed variant is the one Login, Query and Account already use.
 */
export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3"
    >
      {children}
    </p>
  );
}

/** A neutral placeholder while something loads. Matches NewsPanel's existing one. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded ${className}`} aria-hidden="true" />;
}

/**
 * Switches which section of a long page is shown -- Admin's first use
 * (Users/System/Models/…), then Account and Help. A left sidebar at `lg` and
 * up, the same `w-full lg:w-<n> shrink-0` column `ConversationSidebar` already
 * uses beside Chat's transcript; below `lg` it's a wrapped row of pills above
 * the content instead, since a vertical list of nine items would out-scroll a
 * phone screen before the content it's meant to get you to.
 *
 * `<nav>` + `aria-current="page"` rather than a toggle-group's `aria-pressed`
 * -- this picks which piece of the page's content is showing, the same thing
 * `ConversationSidebar` picking a conversation does, not a mode switch like
 * `QueryWorkspace`'s Chat/Single-question toggle.
 */
export function SectionNav<T extends string>({
  section,
  onChange,
  items,
  ariaLabel,
}: {
  section: T;
  onChange: (s: T) => void;
  items: { id: T; label: string }[];
  ariaLabel: string;
}) {
  return (
    <nav aria-label={ariaLabel} className="w-full lg:w-44 shrink-0">
      <div
        className="flex flex-wrap lg:flex-col gap-1 lg:gap-0.5 text-sm
                   pb-3 lg:pb-0 border-b lg:border-b-0 border-gray-200
                   lg:border-r lg:pr-4"
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            aria-current={section === item.id ? "page" : undefined}
            className={`px-2.5 py-1 lg:py-1.5 rounded-md lg:w-full lg:text-left
                        focus-visible:outline-2 focus-visible:outline-offset-2
                        focus-visible:outline-teal-600 ${
                          section === item.id
                            ? "bg-teal-50 text-teal-700 font-medium"
                            : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                        }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

/** One at-a-glance tile on an Overview tab: the basics, and a way to see more. */
export function SummaryTile({
  title,
  onView,
  children,
}: {
  title: string;
  onView: () => void;
  children: ReactNode;
}) {
  return (
    <div className="cx-panel-flat cx-tile-interactive p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <button
          type="button"
          onClick={onView}
          className="text-xs font-medium text-teal-700 hover:text-teal-800 shrink-0"
        >
          View <span aria-hidden="true">→</span>
        </button>
      </div>
      <div className="text-sm text-gray-600 min-h-[1.25rem]">{children}</div>
    </div>
  );
}
