import { describe, expect, it } from "vitest";

import { calculateCyclePrediction, validatePhaseSequence } from "./calculateCycle";

describe("calculateCyclePrediction", () => {
  it("returns expected phase ordering and next key dates", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");

    const prediction = calculateCyclePrediction(start, {
      cycleLengthDays: 28,
      menstruationDays: 5,
      ovulationDays: 3,
      lutealDays: 14,
    });

    expect(prediction.phases.map((p) => p.phaseType)).toEqual([
      "MENSTRUATION",
      "FOLLICULAR",
      "OVULATION",
      "LUTEAL",
    ]);

    expect(prediction.nextOvulation.toISOString()).toBe("2026-01-12T00:00:00.000Z");
    expect(prediction.nextMenstruation.toISOString()).toBe("2026-01-29T00:00:00.000Z");
  });

  it("throws on unsupported cycle length", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");

    expect(() =>
      calculateCyclePrediction(start, {
        cycleLengthDays: 10,
        menstruationDays: 5,
        ovulationDays: 3,
        lutealDays: 14,
      }),
    ).toThrow("Cycle length is out of supported range");
  });
});

describe("validatePhaseSequence", () => {
  it("accepts non-overlapping phase windows", () => {
    expect(() =>
      validatePhaseSequence([
        {
          phaseType: "MENSTRUATION",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          endDate: new Date("2026-01-05T00:00:00.000Z"),
        },
        {
          phaseType: "FOLLICULAR",
          startDate: new Date("2026-01-06T00:00:00.000Z"),
          endDate: new Date("2026-01-11T00:00:00.000Z"),
        },
      ]),
    ).not.toThrow();
  });

  it("throws for overlapping phase windows", () => {
    expect(() =>
      validatePhaseSequence([
        {
          phaseType: "MENSTRUATION",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          endDate: new Date("2026-01-05T00:00:00.000Z"),
        },
        {
          phaseType: "FOLLICULAR",
          startDate: new Date("2026-01-05T00:00:00.000Z"),
          endDate: new Date("2026-01-11T00:00:00.000Z"),
        },
      ]),
    ).toThrow("Phase ranges overlap or are out of order");
  });
});
