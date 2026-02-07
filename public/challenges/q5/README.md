# Challenge Q5: The Final Register Readout

## Problem Statement

You are a penetration tester attempting to recover a sensitive 6-character access key stored in a proprietary system. You have managed to dump the raw memory register, but the developer didn't use standard decimal numbers.

Instead, they used a custom **'Quinary System'** encoding where all values are calculated using powers of five before being stored.

## The Captured Data

The encoded register value (in the Quinary System) is the following sequence of three-digit numbers separated by colons:

**313 : 310 : 314 : 421 : 322 : 310**

## Task

Convert each quinary number to its corresponding ASCII character to reveal the 6-character access key.

## Quinary to Decimal Conversion

For a 3-digit quinary number ABC (where A, B, C are digits 0-4):

- Decimal value = A×5² + B×5¹ + C×5⁰
- Example: 313₅ = 3×25 + 1×5 + 3×1 = 75 + 5 + 3 = 83

## Flag Format

`CG{ACCESS_KEY}` where ACCESS_KEY is the 6-character result

## Hints

1. Each three-digit number represents a character in the ASCII range
2. Convert each quinary number to decimal using powers of 5
3. Map the resulting decimal values to ASCII characters
