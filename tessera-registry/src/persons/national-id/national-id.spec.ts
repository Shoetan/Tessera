import { expect, test } from "vitest";

import { generateFirstDigit, generateTenDigits, generateNationalId, isAllSameDigit } from "./national-id.js";
import { validateVerhoeffCheckDigit } from "./verhoeff.js";



test('generateFirstDigit should return a number between 2 and 9', ()=>{
  const firstDigit = generateFirstDigit();
  expect(typeof firstDigit).toBe('string');
  expect(firstDigit).toHaveLength(1);
  expect(firstDigit).toMatch(/^[2-9]$/); //regex to match a single digit from 2-9

})

test('generateTenDigits should return 10 random digits from 0-9', ()=>{
  const digits = generateTenDigits();
  expect(typeof digits).toBe('string');
  expect(digits).toHaveLength(10);
  expect(digits).toMatch(/^[0-9]{10}$/); //regex to match 10 digits from 0-9

})


test('generateNationalId should return 12 digits with the first digit from 2-9', ()=>{
  const nationalId = generateNationalId();
  expect(typeof nationalId).toBe('string');
  expect(nationalId).toHaveLength(12);
  expect(nationalId).toMatch(/^[2-9][0-9]{11}$/); //regex to match a first digit from 2-9 followed by 10 digits from 0-9


})


test('22222222222 is all the same digit', () => {
  expect(isAllSameDigit('22222222222')).toBe(true);
});

test('24422222224 is not all the same digit', () => {
  expect(isAllSameDigit('24422222224')).toBe(false);
});

test('an empty string is not all the same digit', () => {
  expect(isAllSameDigit('')).toBe(false);
});


test('every generated national ID passes Verhoeff validation', () => {
  // one random ID proves little, so check many
  for (let i = 0; i < 1000; i++) {
    const nationalId = generateNationalId();
    expect(validateVerhoeffCheckDigit(nationalId)).toBe(true);
  }
});
