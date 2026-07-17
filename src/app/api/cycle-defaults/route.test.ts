import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetCurrentUserId, mockFindUnique, mockUpdate, mockAuditCreate } = vi.hoisted(() => {
  return {
    mockGetCurrentUserId: vi.fn(),
    mockFindUnique: vi.fn(),
    mockUpdate: vi.fn(),
    mockAuditCreate: vi.fn(),
  };
});

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserId: mockGetCurrentUserId,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cycleDefaults: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
    auditLog: {
      create: mockAuditCreate,
    },
  },
}));

import { GET, PATCH } from "./route";

describe("/api/cycle-defaults", () => {
  beforeEach(() => {
    mockGetCurrentUserId.mockReset();
    mockFindUnique.mockReset();
    mockUpdate.mockReset();
    mockAuditCreate.mockReset();
  });

  it("GET returns 401 when user is not authenticated", async () => {
    mockGetCurrentUserId.mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ ok: false, error: "Unauthorized" });
  });

  it("PATCH returns 400 when phase totals exceed cycle length", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");

    const request = new Request("http://localhost/api/cycle-defaults", {
      method: "PATCH",
      body: JSON.stringify({
        cycleLengthDays: 28,
        menstruationDays: 10,
        ovulationDays: 4,
        lutealDays: 14,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ ok: false, error: "Phase durations exceed cycle length" });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("PATCH updates defaults and writes audit log", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUpdate.mockResolvedValue({
      userId: "user-1",
      cycleLengthDays: 30,
      menstruationDays: 5,
      ovulationDays: 2,
      lutealDays: 12,
    });
    mockAuditCreate.mockResolvedValue({ id: "audit-1" });

    const request = new Request("http://localhost/api/cycle-defaults", {
      method: "PATCH",
      body: JSON.stringify({
        cycleLengthDays: 30,
        menstruationDays: 5,
        ovulationDays: 2,
        lutealDays: 12,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      data: {
        userId: "user-1",
        cycleLengthDays: 30,
        menstruationDays: 5,
        ovulationDays: 2,
        lutealDays: 12,
      },
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: {
        cycleLengthDays: 30,
        menstruationDays: 5,
        ovulationDays: 2,
        lutealDays: 12,
      },
    });

    expect(mockAuditCreate).toHaveBeenCalledTimes(1);
  });
});
