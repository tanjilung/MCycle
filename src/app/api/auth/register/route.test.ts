import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFindUnique, mockCreate, mockHashPassword } = vi.hoisted(() => {
  return {
    mockFindUnique: vi.fn(),
    mockCreate: vi.fn(),
    mockHashPassword: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      create: mockCreate,
    },
  },
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: mockHashPassword,
}));

import { POST } from "./route";

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockCreate.mockReset();
    mockHashPassword.mockReset();
  });

  it("returns 400 for invalid payload", async () => {
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "bad", name: "", password: "short" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ ok: false, error: "Invalid registration payload" });
  });

  it("returns 409 when email already exists", async () => {
    mockFindUnique.mockResolvedValue({ id: "user-1" });

    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "user@example.com",
        name: "Existing User",
        password: "password-123",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ ok: false, error: "Email is already registered" });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates a user and returns public fields", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockHashPassword.mockResolvedValue("hashed-password");
    mockCreate.mockResolvedValue({
      id: "user-2",
      email: "new@example.com",
      name: "New User",
    });

    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "new@example.com",
        name: "New User",
        password: "password-123",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      ok: true,
      data: {
        id: "user-2",
        email: "new@example.com",
        name: "New User",
      },
    });
    expect(mockHashPassword).toHaveBeenCalledWith("password-123");
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
