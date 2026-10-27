import {randomInt} from "node:crypto";

export function generateFirstDigit () : string {
  // I can have lower and upper bounds for the first digit. It should be from 2 - 9 as constant values

  const lowerBound = 2;
  const upperBound = 10;

  //Generate random digit using 

  const firstDigit =  randomInt(lowerBound, upperBound); 

  return String(firstDigit);

}


export function generateTenDigits () {
  // I can have the lower and upper bounds for the digits. It should be from 0 - 9 as constant values

  const lowerBound = 0;
  const upperBound = 10;

  let digits = '';

  for (let i = 0; i < 10; i++) {
    const digit = randomInt(lowerBound, upperBound);
    digits += String(digit); 
  }

  return digits;

}

export function generateNationalId () : string {
  const firstDigit = generateFirstDigit();
  const tenDigits = generateTenDigits();

  return `${firstDigit}${tenDigits}`;
}

export function isAllSameDigit(id: string): boolean {
  if (id.length === 0) {
    return false;
  }
  const firstChar = id[0];
  for (let i = 1; i <id.length ; i ++) {
    if (id[i] !== firstChar) {
      return false;
    }
  }

  return true;
}