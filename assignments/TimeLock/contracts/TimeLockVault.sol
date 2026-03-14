// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 *  TimeLockVault
 *  Timelocked savings vault where each user can lock ETH until a future time.
 *  Each address can have only one active vault at a time.
 */
contract TimeLockVault {
    error ActiveVaultExists();
    error NoActiveVault();
    error UnlockTimeInPast();
    error ZeroDeposit();
    error TooEarly();
    error DirectTransferNotAllowed();

    struct Vault {
        uint256 amount;
        uint256 unlockTime;
        bool active;
    }

    mapping(address => Vault) public vaults;

    event Deposited(address indexed user, uint256 amount, uint256 unlockTime);
    event Withdrawn(address indexed user, uint256 amount);

    /**
     *  Deposit ETH and lock it until a specified unlock time.
     *  unlockTime Unix timestamp in the future.
     */
    function deposit(uint256 unlockTime) external payable {
        if (vaults[msg.sender].active) revert ActiveVaultExists();
        if (msg.value == 0) revert ZeroDeposit();
        if (unlockTime <= block.timestamp) revert UnlockTimeInPast();

        vaults[msg.sender] = Vault({
            amount: msg.value,
            unlockTime: unlockTime,
            active: true
        });

        emit Deposited(msg.sender, msg.value, unlockTime);
    }

    /**
     *  Withdraw the full balance after the unlock time.
     */
    function withdraw() external {
        Vault memory vault = vaults[msg.sender];
        if (!vault.active) revert NoActiveVault();
        if (block.timestamp < vault.unlockTime) revert TooEarly();

        // Reset state before external call to prevent reentrancy.
        delete vaults[msg.sender];

        (bool sent, ) = msg.sender.call{value: vault.amount}("" );
        require(sent, "WITHDRAW_FAILED");

        emit Withdrawn(msg.sender, vault.amount);
    }

    // Reject direct ETH transfers (must use deposit).
    receive() external payable {
        revert DirectTransferNotAllowed();
    }
}
