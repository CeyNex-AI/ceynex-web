import { beforeEach, describe, expect, it } from "vitest";
import { clearToken, getToken, setToken } from "./tokenStorage";

describe("tokenStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null before anything is stored", () => {
    expect(getToken()).toBeNull();
  });

  it("round-trips a token through localStorage", () => {
    setToken("abc.def.ghi");
    expect(getToken()).toBe("abc.def.ghi");
  });

  it("clears the token", () => {
    setToken("abc.def.ghi");
    clearToken();
    expect(getToken()).toBeNull();
  });

  it("overwrites a previously stored token rather than appending", () => {
    setToken("first");
    setToken("second");
    expect(getToken()).toBe("second");
  });
});
