import { normalizeEmail, normalizePhone } from "./authService";

describe("authentication input normalization", () => {
  test("normalizes email casing and whitespace", () => {
    expect(normalizeEmail("  Player@Example.COM ")).toBe("player@example.com");
  });

  test("normalizes a ten-digit Indian mobile number to E.164", () => {
    expect(normalizePhone("98765 43210")).toBe("+919876543210");
  });

  test("keeps an international number in E.164 form", () => {
    expect(normalizePhone("+44 7700 900123")).toBe("+447700900123");
  });

  test("rejects invalid contact identifiers", () => {
    expect(() => normalizeEmail("not-an-email")).toThrow("valid email");
    expect(() => normalizePhone("1234")).toThrow("valid mobile");
  });
});
