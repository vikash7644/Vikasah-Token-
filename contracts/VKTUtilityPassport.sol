// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VKTUtilityPassport
 * @notice A user-controlled, fixed 180-day VKT lock for utility access proofs.
 * @dev No owner, admin, mint, confiscation, early-unlock, or arbitrary withdrawal
 *      function exists. Each wallet may have one active position at a time.
 */
contract VKTUtilityPassport is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant LOCK_DURATION = 180 days;

    struct Position {
        uint256 amount;
        uint256 unlockAt;
    }

    IERC20 public immutable vkt;
    mapping(address => Position) private positions;

    error ZeroTokenAddress();
    error InvalidTokenContract();
    error ZeroAmount();
    error PositionAlreadyActive();
    error NoActivePosition();
    error StillLocked(uint256 unlockAt);

    event Locked(address indexed account, uint256 amount, uint256 unlockAt);
    event Withdrawn(address indexed account, uint256 amount);

    constructor(address tokenAddress) {
        if (tokenAddress == address(0)) revert ZeroTokenAddress();
        if (tokenAddress.code.length == 0) revert InvalidTokenContract();
        vkt = IERC20(tokenAddress);
    }

    function lock(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (positions[msg.sender].amount != 0) revert PositionAlreadyActive();

        uint256 unlockAt = block.timestamp + LOCK_DURATION;
        positions[msg.sender] = Position({amount: amount, unlockAt: unlockAt});
        vkt.safeTransferFrom(msg.sender, address(this), amount);

        emit Locked(msg.sender, amount, unlockAt);
    }

    function withdraw() external nonReentrant {
        Position memory position = positions[msg.sender];
        if (position.amount == 0) revert NoActivePosition();
        if (block.timestamp < position.unlockAt) revert StillLocked(position.unlockAt);

        delete positions[msg.sender];
        vkt.safeTransfer(msg.sender, position.amount);

        emit Withdrawn(msg.sender, position.amount);
    }

    function positionOf(address account) external view returns (uint256 amount, uint256 unlockAt) {
        Position memory position = positions[account];
        return (position.amount, position.unlockAt);
    }

    function isLocked(address account) external view returns (bool) {
        Position memory position = positions[account];
        return position.amount != 0 && block.timestamp < position.unlockAt;
    }

    function hasActivePassport(address account) external view returns (bool) {
        return positions[account].amount != 0 && block.timestamp < positions[account].unlockAt;
    }
}
