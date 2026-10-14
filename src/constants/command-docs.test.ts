import { describe, expect, test } from "bun:test";
import {
  COMMANDS,
  GROUP_ORDER,
  allCommandNames,
  renderCommandHelp,
  suggestCommands,
} from "./command-docs";
import { STALI_SUBCOMMANDS } from "../cli-route";

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

  test("không quảng cáo lệnh không tồn tại", () => {
    // `models` từng nằm trong danh mục nhưng KHÔNG được đăng ký → gõ vào là mở wizard.
    expect(allCommandNames()).not.toContain("models");
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

  test("không tự gợi ý lại chính từ đã gõ", () => {
    // Nếu lệnh không tồn tại, KHÔNG được trả về chính nó (bug `stali models`
    // từng in "Có phải bạn muốn: models ?").
    for (const input of ["models", "foo", "zzz"]) {
      expect(suggestCommands(input)).not.toContain(input);
    }
  });
});

describe("STALI_SUBCOMMANDS khớp với danh mục", () => {
  test("mọi lệnh trong danh mục đều có trong STALI_SUBCOMMANDS (trừ alias)", () => {
    for (const c of COMMANDS) {
      expect(STALI_SUBCOMMANDS.has(c.name)).toBe(true);
    }
  });

  test("mọi mục trong STALI_SUBCOMMANDS đều được quảng cáo (trừ wizard)", () => {
    const advertised = new Set(allCommandNames());
    for (const name of STALI_SUBCOMMANDS) {
      if (name === "wizard") continue;
      expect(advertised.has(name)).toBe(true);
    }
  });
});
