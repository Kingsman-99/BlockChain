# Simple Crowdfunding Contract

A goal-based crowdfunding campaign. If the goal is met, the owner withdraws; otherwise, contributors can refund after the deadline.

## Rules
- Owner sets a funding goal and deadline at deployment.
- Contributors can add ETH before the deadline.
- If the goal is met, the owner can withdraw after the deadline.
- If the goal is not met, contributors can refund after the deadline.
- Double refunds are prevented.

## Local Commands
```bash
npm test
npm run compile
```
