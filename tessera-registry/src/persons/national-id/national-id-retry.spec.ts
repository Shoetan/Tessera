import { expect, test, vi } from "vitest";
import { randomInt } from "node:crypto";

// Fake the dice: the first 11 draws all return 2, so the first body is 22222222222.
// After that, real random digits. This forces the "draw again" path, which would
// otherwise fire about once in ten billion IDs.
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  let calls = 0;
  return {
    ...actual,
    randomInt: vi.fn((min: number, max: number) => (calls++ < 11 ? 2 : actual.randomInt(min, max))),
  };
});

import { generateNationalId, isAllSameDigit } from "./national-id.js";

test('generateNationalId draws again when the body is all the same digit', () => {
  const nationalId = generateNationalId();
  const body = nationalId.slice(0, 11);

  expect(isAllSameDigit(body)).toBe(false);
  // 11 draws for the rejected body + 11 for the one that was kept
  expect(randomInt).toHaveBeenCalledTimes(22);
});
