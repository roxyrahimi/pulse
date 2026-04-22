import { validateTaskInput, validateTaskPatch, validateSubtaskTitle } from "./pulse-validation";

describe("validateTaskInput", () => {
  const valid = {
    title: "Essay",
    category: "School",
    deadline: "2026-04-25T23:59:00Z",
    estimatedMinutes: 120,
    priority: "High",
    mode: "student",
  };

  test("accepts a fully-valid payload", () => {
    expect(validateTaskInput(valid)).toEqual({ ok: true });
  });

  test("rejects empty/whitespace title", () => {
    const r = validateTaskInput({ ...valid, title: "   " });
    expect(r.ok).toBe(false);
  });

  test("rejects unparseable deadline", () => {
    const r = validateTaskInput({ ...valid, deadline: "not-a-date" });
    expect(r.ok).toBe(false);
  });

  test("rejects negative estimatedMinutes", () => {
    const r = validateTaskInput({ ...valid, estimatedMinutes: -5 });
    expect(r.ok).toBe(false);
  });

  test("rejects non-integer estimatedMinutes", () => {
    const r = validateTaskInput({ ...valid, estimatedMinutes: 12.5 });
    expect(r.ok).toBe(false);
  });

  test("rejects invalid priority", () => {
    const r = validateTaskInput({ ...valid, priority: "Urgent" });
    expect(r.ok).toBe(false);
  });

  test("rejects invalid category", () => {
    const r = validateTaskInput({ ...valid, category: "Hobby" });
    expect(r.ok).toBe(false);
  });
});

describe("validateTaskPatch", () => {
  test("accepts empty patch", () => {
    expect(validateTaskPatch({})).toEqual({ ok: true });
  });

  test("rejects empty title when provided", () => {
    expect(validateTaskPatch({ title: "   " }).ok).toBe(false);
  });

  test("rejects invalid status", () => {
    expect(validateTaskPatch({ status: "archived" }).ok).toBe(false);
  });

  test("accepts valid partial patch", () => {
    expect(validateTaskPatch({ status: "done", estimatedMinutes: 0 })).toEqual({ ok: true });
  });
});

describe("validateSubtaskTitle", () => {
  test("accepts non-empty title", () => {
    expect(validateSubtaskTitle("Write intro")).toEqual({ ok: true });
  });

  test("rejects whitespace-only title", () => {
    expect(validateSubtaskTitle("   ").ok).toBe(false);
  });
});
