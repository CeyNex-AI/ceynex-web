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
