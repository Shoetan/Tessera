import { expect, test } from "vitest";

import {verhoeffCheckDigit, verhoeffValidate} from "./verhoeff.js";


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
  const isValid = verhoeffValidate(id);
  expect(isValid).toBe(true); 
})


test('2363 is valid', () => {
  const id = '2363';
  const isValid = verhoeffValidate(id);
  expect(isValid).toBe(true);
});


test('23609 is invalid (wrong check digit)', () => {
  const id = '23609';
  const isValid = verhoeffValidate(id);
  expect(isValid).toBe(false);
});


test('32606 is invalid (first two digits swapped)', () => {
  const id = '32606';
  const isValid = verhoeffValidate(id);
  expect(isValid).toBe(false);
});


test('23066 is invalid (two middle digits swapped)', () => {
  const id = '23066';
  const isValid = verhoeffValidate(id);
  expect(isValid).toBe(false);
});
