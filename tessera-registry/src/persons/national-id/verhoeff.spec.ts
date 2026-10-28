import { expect, test } from "vitest";

import {verhoeffCheckDigit, validateVerhoeffCheckDigit} from "./verhoeff.js";
import { generateNationalId } from "./national-id.js";


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


test('23606 is valid', () => {
  const id = '23606';
  const isValid = validateVerhoeffCheckDigit(id);
  expect(isValid).toBe(true); 
})


test('2363 is valid', () => {
  const id = '2363';
  const isValid = validateVerhoeffCheckDigit(id);
  expect(isValid).toBe(true);
});


test('23609 is invalid (wrong check digit)', () => {
  const id = '23609';
  const isValid = validateVerhoeffCheckDigit(id);
  expect(isValid).toBe(false);
});


test('32606 is invalid (first two digits swapped)', () => {
  const id = '32606';
  const isValid = validateVerhoeffCheckDigit(id);
  expect(isValid).toBe(false);
});


test('23066 is invalid (two middle digits swapped)', () => {
  const id = '23066';
  const isValid = validateVerhoeffCheckDigit(id);
  expect(isValid).toBe(false);
});


test('changing any single digit of a valid ID makes it invalid', () => {
  const id = generateNationalId();

  for (let i = 0; i < id.length; i++) {
    // (digit + 1) % 10 always gives a different digit, and 9 wraps round to 0
    const changedDigit = (Number(id[i]) + 1) % 10;
    const changedId = id.slice(0, i) + changedDigit + id.slice(i + 1);
    expect(validateVerhoeffCheckDigit(changedId)).toBe(false);
  }
});
