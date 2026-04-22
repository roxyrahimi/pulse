import { computeUrgency, generateSessions, formatDuration, formatRemaining } from "./pulse";

describe("computeUrgency", () => {
  const baseTask = {
    estimatedMinutes: 60,
    completedMinutes: 0,
    priority: "Medium" as const,
    status: "pending" as const,
  };

  test("returns overdue when deadline passed", () => {
    const now = new Date("2026-04-20T12:00:00Z");
    const r = computeUrgency({ ...baseTask, deadline: "2026-04-20T11:00:00Z" }, now);
    expect(r.level).toBe("overdue");
    expect(r.score).toBe(100);
  });

  test("returns 'now' when barely enough time", () => {
    const now = new Date("2026-04-20T12:00:00Z");
    // 60m work, 65m remaining → ratio ~0.92
    const r = computeUrgency({ ...baseTask, deadline: "2026-04-20T13:05:00Z" }, now);
    expect(["now", "soon"]).toContain(r.level);
  });

  test("returns 'chill' when lots of runway", () => {
    const now = new Date("2026-04-20T12:00:00Z");
    // 60m task, 100 hours remaining
    const r = computeUrgency({ ...baseTask, deadline: "2026-04-24T16:00:00Z" }, now);
    expect(r.level).toBe("chill");
  });

  test("Critical priority increases urgency", () => {
    const now = new Date("2026-04-20T12:00:00Z");
    const mid = { ...baseTask, deadline: "2026-04-20T15:00:00Z" };
    const medium = computeUrgency(mid, now);
    const critical = computeUrgency({ ...mid, priority: "Critical" }, now);
    expect(critical.score).toBeGreaterThan(medium.score);
  });

  test("returns done when status is done", () => {
    const now = new Date("2026-04-20T12:00:00Z");
    const r = computeUrgency({ ...baseTask, status: "done", deadline: "2026-04-20T11:00:00Z" }, now);
    expect(r.level).toBe("chill");
    expect(r.score).toBe(0);
  });

  test("optimalStart is before deadline", () => {
    const now = new Date("2026-04-20T12:00:00Z");
    const r = computeUrgency({ ...baseTask, deadline: "2026-04-22T12:00:00Z" }, now);
    expect(r.optimalStart.getTime()).toBeLessThan(new Date("2026-04-22T12:00:00Z").getTime());
  });

  test("overdue result has non-finite ratio and score capped at 100", () => {
    const now = new Date("2026-04-20T12:00:00Z");
    const r = computeUrgency({ ...baseTask, deadline: "2026-04-19T12:00:00Z" }, now);
    expect(r.level).toBe("overdue");
    expect(isFinite(r.ratio)).toBe(false);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  test("zero-estimate task scores by priority + proximity only", () => {
    const now = new Date("2026-04-20T12:00:00Z");
    const r = computeUrgency(
      { ...baseTask, estimatedMinutes: 0, priority: "Critical", deadline: "2026-04-20T15:00:00Z" },
      now,
    );
    expect(Number.isNaN(r.ratio)).toBe(true);
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe("generateSessions", () => {
  test("splits long task into multiple chunks", () => {
    const sessions = generateSessions(
      {
        id: "t",
        estimatedMinutes: 180,
        completedMinutes: 0,
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      },
      { start: new Date() },
    );
    expect(sessions.length).toBeGreaterThanOrEqual(3);
    expect(sessions[0]?.durationMinutes).toBe(50);
  });

  test("returns empty when already done", () => {
    const sessions = generateSessions({
      id: "t",
      estimatedMinutes: 60,
      completedMinutes: 60,
      deadline: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    });
    expect(sessions).toEqual([]);
  });
});

describe("formatters", () => {
  test("formatDuration", () => {
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(125)).toBe("2h 5m");
  });

  test("formatRemaining", () => {
    expect(formatRemaining(0)).toBe("Overdue");
    expect(formatRemaining(30)).toBe("30m");
    expect(formatRemaining(90)).toBe("1h 30m");
    expect(formatRemaining(60 * 25)).toBe("1d 1h");
  });
});
