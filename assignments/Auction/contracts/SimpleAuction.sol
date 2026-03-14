// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title SimpleAuction
 * @notice A basic ETH auction where the highest bidder wins after a fixed duration.
 * @dev Outbid bidders can withdraw their refundable balances manually.
 */
contract SimpleAuction {
    error OnlyOwner();
    error OwnerCannotBid();
    error AuctionHasEnded();
    error AuctionNotEnded();
    error BidTooLow();
    error AlreadyEnded();

    address public immutable owner;
    uint256 public immutable startTime;
    uint256 public immutable endTime;
    uint256 public immutable startingPrice;

    address public highestBidder;
    uint256 public highestBid;
    bool public ended;

    // Refundable balances for outbid bidders (pull-based).
    mapping(address => uint256) public pendingRefunds;

    event BidPlaced(address indexed bidder, uint256 amount);
    event AuctionFinalized(address indexed winner, uint256 winningBid);
    event Refunded(address indexed bidder, uint256 amount);

    constructor(uint256 _startingPrice, uint256 _durationSeconds) {
        if (_startingPrice == 0) revert BidTooLow();
        owner = msg.sender;
        startingPrice = _startingPrice;
        startTime = block.timestamp;
        endTime = block.timestamp + _durationSeconds;

        highestBid = _startingPrice;
        highestBidder = address(0);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    /**
     * @notice Place a bid by sending ETH.
     */
    function bid() external payable {
        if (msg.sender == owner) revert OwnerCannotBid();
        if (block.timestamp >= endTime) revert AuctionHasEnded();
        if (msg.value <= highestBid) revert BidTooLow();

        if (highestBidder != address(0)) {
            // Refunds are pull-based to avoid reentrancy during bidding.
            pendingRefunds[highestBidder] += highestBid;
        }

        highestBidder = msg.sender;
        highestBid = msg.value;

        emit BidPlaced(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw refundable ETH after being outbid.
     */
    function withdrawRefund() external {
        uint256 amount = pendingRefunds[msg.sender];
        if (amount == 0) return;

        // Zero-out before transfer to prevent reentrancy/double-withdraw.
        pendingRefunds[msg.sender] = 0;
        (bool sent, ) = msg.sender.call{value: amount}("" );
        require(sent, "REFUND_FAILED");

        emit Refunded(msg.sender, amount);
    }

    /**
     * @notice End the auction after the duration has passed.
     */
    function endAuction() external onlyOwner {
        if (block.timestamp < endTime) revert AuctionNotEnded();
        if (ended) revert AlreadyEnded();

        ended = true;
        // Only pay out if there was at least one valid bid.
        uint256 payout = highestBidder == address(0) ? 0 : highestBid;

        if (payout > 0) {
            (bool sent, ) = owner.call{value: payout}("" );
            require(sent, "PAYOUT_FAILED");
        }

        emit AuctionFinalized(highestBidder, highestBid);
    }
}
