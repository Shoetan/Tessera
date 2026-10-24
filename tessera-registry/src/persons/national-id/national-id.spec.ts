import { expect, test } from "vitest";

import { generateFirstDigit, generateTenDigits, generateNationalId } from "./national-id.js";



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


test('generateNationalId should return 11 digits with the first digit from 2-9', ()=>{
  const nationalId = generateNationalId();
  expect(typeof nationalId).toBe('string');
  expect(nationalId).toHaveLength(11);
  expect(nationalId).toMatch(/^[2-9][0-9]{10}$/); //regex to match a first digit from 2-9 followed by 10 digits from 0-9


})
