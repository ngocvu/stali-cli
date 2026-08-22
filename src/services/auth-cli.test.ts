import { describe, expect, test } from "bun:test";
import { listGuideIds, renderAppGuide } from "../constants/guides";
import { getAuthHelpText } from "../services/auth-cli";

describe("guides", () => {
  test("renderAppGuide cursor", () => {
    const text = renderAppGuide("cursor");
    expect(text).toContain("Cursor");
    expect(text).toContain("api.stali.vn");
  });

  test("listGuideIds", () => {
    expect(listGuideIds()).toContain("chatbox");
  });

  test("unknown guide null", () => {
    expect(renderAppGuide("unknown-app")).toBeNull();
  });
});

describe("getAuthHelpText", () => {
  test("có login và dashboard url", () => {
    const t = getAuthHelpText();
    expect(t).toContain("auth login");
    expect(t).toContain("dashboard/keys");
  });
});
