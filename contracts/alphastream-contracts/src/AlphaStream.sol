// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AlphaStream Token (APS)
 * @author Your Name
 * @notice This is the custom ERC20 reward token for the AlphaStakes platform.
 *
 * It follows a standard fixed-supply model:
 * - The total supply is created and minted at deployment.
 * - All tokens are initially assigned to the contract deployer (owner).
 * - The owner is then responsible for distributing these tokens, primarily by
 *   funding the AlphaStakes betting contract to use as a rewards pool.
 */
contract AlphaStream is ERC20, Ownable {
    /**
     * @notice Sets up the token with its name, symbol, and initial supply.
     * @param initialOwner The address that will receive the entire initial supply and become the contract owner.
     */
    constructor(address initialOwner)
        ERC20("AlphaStream", "APS") // Sets the token Name and Symbol
        Ownable(initialOwner)      // Sets the contract owner
    {
        // Define the total supply. Here, we mint 1 Billion tokens.
        // ERC20 tokens have a `decimals` property, which is 18 by default.
        // So, 1 token = 1 * 10^18 of the smallest unit.
        uint256 totalSupply = 1_000_000_000 * (10**decimals());

        // Mint the entire supply to the owner's address.
        _mint(initialOwner, totalSupply);
    }
}