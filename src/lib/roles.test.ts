import { describe, expect, it } from "vitest";
import { ALL_ROLES, ROLE_LABELS, SIGNUP_ROLES } from "./roles";

describe("roles", () => {
  it("excludes admin from the roles a signup may pick", () => {
    expect(SIGNUP_ROLES).not.toContain("admin");
  });

  it("gives every role in ALL_ROLES a label", () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_LABELS[role]).toBeTruthy();
    }
  });

  it("has every signup role also present in ALL_ROLES", () => {
    for (const role of SIGNUP_ROLES) {
      expect(ALL_ROLES).toContain(role);
    }
  });
});
