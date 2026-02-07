# Challenge Q2: Pair Sum Optimization

## Problem Statement

You are auditing a data processing script for a university that needs to quickly count successful pairings of student IDs. You are given a large array of unique, positive, and sorted integer IDs.

The university defines a successful pair as any two distinct IDs a, b in the array whose sum equals a specific target number, T.

Your primary constraint is **efficiency**. Since the list is already sorted, you must devise an algorithm that counts all unique pairs in a single, highly optimized pass that avoids nested loops—a technique typically required for speed in large datasets.

## Example

Given array: `[1, 2, 3, 4, 6]` and target `T = 6`

- Valid pairs: (2,4) - sum = 6
- Answer: 1 pair found

## Task

Determine the algorithm name that efficiently solves this problem.

## Flag Format

`CG{ALGORITHM_NAME}`

## Hints

1. Since the array is sorted, set one marker (a pointer) at the first element (index 0) and the second marker at the last element (index length - 1).
2. At each step, you only need to calculate the sum of the elements at your two markers and compare it to T. If the sum is less than T, you must increase the sum, so move the low pointer one step inward. If the sum is greater than T, you must decrease the sum, so move the high pointer one step inward.
3. Your entire solution can be contained within a simple while loop that continues as long as your low pointer is less than your high pointer.
