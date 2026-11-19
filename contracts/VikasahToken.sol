// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title Vikasah Token
 * @notice Fixed-supply BEP-20/ERC-20 token for BNB Smart Chain.
 * @dev Mints 30% to the configured owner-allocation wallet and 70% to a
 *      separate distribution reserve wallet exactly once at deployment.
 *      There is no mint function; burns permanently reduce total supply.
 */
contract VikasahToken is
    ERC20,
    ERC20Burnable,
    ERC20Capped,
    ERC20Pausable,
    ERC20Permit,
    Ownable2Step
{
    uint256 public constant MAX_SUPPLY = 1_000_000_000 ether;
    uint256 public constant OWNER_ALLOCATION = 300_000_000 ether;
    uint256 public constant DISTRIBUTION_RESERVE = 700_000_000 ether;

    error ZeroAddress();
    error DuplicateAllocationWallets();
    error DuplicateAdminWallets();
    error RenounceOwnershipDisabled();

    constructor(
        address initialOwner,
        address ownerAllocationReceiver,
        address distributionReceiver
    )
        ERC20("Vikasah Token", "VKT")
        ERC20Capped(MAX_SUPPLY)
        ERC20Permit("Vikasah Token")
        Ownable(initialOwner)
    {
        if (
            initialOwner == address(0) ||
            ownerAllocationReceiver == address(0) ||
            distributionReceiver == address(0)
        ) revert ZeroAddress();

        if (ownerAllocationReceiver == distributionReceiver) {
            revert DuplicateAllocationWallets();
        }
        if (
            initialOwner == ownerAllocationReceiver ||
            initialOwner == distributionReceiver
        ) revert DuplicateAdminWallets();

        _mint(ownerAllocationReceiver, OWNER_ALLOCATION);
        _mint(distributionReceiver, DISTRIBUTION_RESERVE);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @dev Keep administrative recovery possible; use two-step transfer instead.
    function renounceOwnership() public override onlyOwner {
        revert RenounceOwnershipDisabled();
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
