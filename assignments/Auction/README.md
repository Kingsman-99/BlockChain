# Simple Auction Contract

A basic ETH auction. Bids must increase over time, and outbid users can withdraw refunds. The owner ends the auction after the duration.

## Rules
- Owner sets `startingPrice` and `auctionDuration` at deployment.
- Bids must be higher than the current highest bid.
- Outbid users withdraw refunds manually (pull-based).
- Auction ends after the duration; only the owner can end it.

## Local Commands
```bash
npm test
npm run compile
```
