# Timelocked Savings Vault

A simple timelocked vault where each user can lock ETH and withdraw only after a specified time.

## Rules
- One active vault per user.
- Deposits require a future `unlockTime` and non-zero ETH.
- Withdrawal is only allowed after `block.timestamp >= unlockTime`.
- Full balance is withdrawn at once.
- Direct ETH transfers are rejected.

## Local Commands
```bash
npm test
npm run compile
```
