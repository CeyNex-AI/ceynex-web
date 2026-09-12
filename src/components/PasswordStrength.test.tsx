import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PasswordStrength from "./PasswordStrength";
import * as passwordStrength from "../lib/passwordStrength";

describe("PasswordStrength", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders nothing for an empty password", () => {
    const { container } = render(<PasswordStrength password="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the strength label immediately, without waiting on the breach check", () => {
    vi.spyOn(passwordStrength, "pwnedCount").mockResolvedValue(-1);
    render(<PasswordStrength password="abc" />);
    expect(screen.getByText("Very weak")).toBeInTheDocument();
  });

  it("shows a breach warning once the debounced check finds one", async () => {
    // A count under 1000, deliberately -- toLocaleString()'s grouping
    // separator is locale-dependent and not what this test means to check.
    vi.spyOn(passwordStrength, "pwnedCount").mockResolvedValue(5);
    render(<PasswordStrength password="hunter2" />);
    expect(screen.queryByText(/known breaches/)).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(screen.getByText(/found in 5 known breaches/)).toBeInTheDocument();
  });

  it("shows no breach warning when the password isn't in the corpus", async () => {
    vi.spyOn(passwordStrength, "pwnedCount").mockResolvedValue(0);
    render(<PasswordStrength password="a-genuinely-unique-passphrase" />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(screen.queryByText(/known breaches/)).not.toBeInTheDocument();
  });

  it("does not check passwords shorter than 4 characters", async () => {
    const pwned = vi.spyOn(passwordStrength, "pwnedCount").mockResolvedValue(999);
    render(<PasswordStrength password="abc" />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(pwned).not.toHaveBeenCalled();
  });
});
