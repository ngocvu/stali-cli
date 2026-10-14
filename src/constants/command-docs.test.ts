import { describe, expect, test } from "bun:test";
import {
  COMMANDS,
  GROUP_ORDER,
  allCommandNames,
  renderCommandHelp,
  suggestCommands,
} from "./command-docs";

describe("command-docs", () => {
  test("mọi lệnh có nhóm hợp lệ và mô tả", () => {
    for (const c of COMMANDS) {
      expect(GROUP_ORDER).toContain(c.group);
      expect(c.summary.length).toBeGreaterThan(5);
      expect(c.name).toBe(c.name.trim().toLowerCase());
    }
  });

  test("không trùng tên lệnh", () => {
    const names = COMMANDS.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test("allCommandNames gồm cả alias", () => {
    const names = allCommandNames();
    expect(names).toContain("setup");
    expect(names).toContain("onboard");
    expect(names).toContain("ready");
    expect(names).toContain("gw");
    expect(names).toContain("ls");
  });

  test("renderCommandHelp bản gọn ẩn lệnh nâng cao", () => {
    const help = renderCommandHelp();
    expect(help).toContain("setup");
    expect(help).toContain("doctor");
    expect(help).toContain("stali help advanced");
    // lệnh nâng cao không xuất hiện ở bản gọn
    expect(help).not.toContain("stali completion install");
  });

  test("renderCommandHelp advanced hiện đủ lệnh", () => {
    const help = renderCommandHelp({ advanced: true });
    for (const c of COMMANDS) {
      expect(help).toContain(c.name);
    }
  });
});

describe("suggestCommands", () => {
  test("gợi ý lệnh gần đúng khi gõ sai", () => {
    expect(suggestCommands("stauts")).toContain("status");
    expect(suggestCommands("docotr")).toContain("doctor");
    expect(suggestCommands("confgiure")).toContain("configure");
    expect(suggestCommands("onbord")).toContain("onboard");
  });

  test("không gợi ý bừa cho chuỗi vô nghĩa", () => {
    expect(suggestCommands("zzzzzzzzzzz")).toEqual([]);
    expect(suggestCommands("")).toEqual([]);
  });

  test("giới hạn số gợi ý", () => {
    expect(suggestCommands("config", 1).length).toBeLessThanOrEqual(1);
  });
});
