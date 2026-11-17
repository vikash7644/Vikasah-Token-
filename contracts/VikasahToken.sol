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
 * @dev The full 1 billion token supply is minted once to initialReceiver.
 *      There is deliberately no owner mint function. Burns reduce totalSupply
 *      and do not authorize re-minting. Owner is a separate administrative role.
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

    error ZeroAddress();

    constructor(address initialOwner, address initialReceiver)
        ERC20("Vikasah Token", "VKT")
        ERC20Capped(MAX_SUPPLY)
        ERC20Permit("Vikasah Token")
        Ownable(initialOwner)
    {
        if (initialOwner == address(0) || initialReceiver == address(0)) {
            revert ZeroAddress();
        }
        _mint(initialReceiver, MAX_SUPPLY);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
