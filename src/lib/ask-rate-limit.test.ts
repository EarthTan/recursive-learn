import { describe, expect, it } from "vitest";
import { getClientIp } from "./ask-rate-limit";

describe("getClientIp", () => {
  it("prefers CF-Connecting-IP", () => {
    const r = new Request("http://x", {
      headers: { "CF-Connecting-IP": "1.1.1.1", "X-Forwarded-For": "2.2.2.2" }
    });
    expect(getClientIp(r)).toBe("1.1.1.1");
  });

  it("uses first X-Forwarded-For when CF header missing", () => {
    const r = new Request("http://x", {
      headers: { "X-Forwarded-For": "3.3.3.3, 4.4.4.4" }
    });
    expect(getClientIp(r)).toBe("3.3.3.3");
  });

  it("falls back to unknown", () => {
    expect(getClientIp(new Request("http://x"))).toBe("unknown");
  });
});
