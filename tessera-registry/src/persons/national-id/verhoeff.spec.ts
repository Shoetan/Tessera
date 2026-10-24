import { expect, test } from "vitest";

import {verhoeffCheckDigit} from "./verhoeff.js";


test('2360 gives check digit 6', () => {
  const number = '2360';
  const checkDigit = verhoeffCheckDigit(number);
  expect(checkDigit).toBe(6); 
});


test('236 gives check digit 3', () => {
  const number2 = '236';
  const checkDigit2 = verhoeffCheckDigit(number2);
  expect(checkDigit2).toBe(3); 
});