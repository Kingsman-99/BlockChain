// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * Crowdfunding
 * Simple goal-based crowdfunding with refunds if the goal is not met.
 * Single campaign per contract instance.
 */
contract Crowdfunding {
    error OnlyOwner();
    error GoalNotMet();
    error GoalMet();
    error DeadlineNotReached();
    error DeadlinePassed();
    error ZeroContribution();
    error AlreadyRefunded();

    address public immutable owner;
    uint256 public immutable goal;
    uint256 public immutable deadline;

    uint256 public totalRaised;
    mapping(address => uint256) public contributions;
    mapping(address => bool) public refunded;

    event Contributed(address indexed contributor, uint256 amount);
    event Withdrawn(address indexed owner, uint256 amount);
    event Refunded(address indexed contributor, uint256 amount);

    constructor(uint256 _goal, uint256 _durationSeconds) {
        if (_goal == 0) revert ZeroContribution();
        owner = msg.sender;
        goal = _goal;
        deadline = block.timestamp + _durationSeconds;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    /**
     *  Contribute ETH to the campaign before the deadline.
     */
    function contribute() external payable {
        if (block.timestamp > deadline) revert DeadlinePassed();
        if (msg.value == 0) revert ZeroContribution();

        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;

        emit Contributed(msg.sender, msg.value);
    }

    /**
     *  Owner withdraws funds once the goal is met.
     */
    function withdraw() external onlyOwner {
        if (block.timestamp <= deadline) revert DeadlineNotReached();
        if (totalRaised < goal) revert GoalNotMet();

        uint256 amount = address(this).balance;
        (bool sent, ) = owner.call{value: amount}("" );
        require(sent, "WITHDRAW_FAILED");

        emit Withdrawn(owner, amount);
    }

    /**
     *  Refund contributors if the goal is not met after the deadline.
     */
    function refund() external {
        if (block.timestamp <= deadline) revert DeadlineNotReached();
        if (totalRaised >= goal) revert GoalMet();
        if (refunded[msg.sender]) revert AlreadyRefunded();

        uint256 amount = contributions[msg.sender];
        refunded[msg.sender] = true;
        contributions[msg.sender] = 0;

        (bool sent, ) = msg.sender.call{value: amount}("" );
        require(sent, "REFUND_FAILED");

        emit Refunded(msg.sender, amount);
    }

    function isGoalMet() external view returns (bool) {
        return totalRaised >= goal;
    }

    function timeRemaining() external view returns (uint256) {
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }
}
