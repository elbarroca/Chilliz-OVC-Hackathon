// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AlphaCredit (AC)
 * @author AlphaStakes Protocol
 * @notice This is the internal, non-transferable utility token for the AlphaStakes ecosystem.
 * It functions as a unit of account for all staking and winning activities within the
 * protocol.
 *
 * KEY PROPERTIES:
 * - 1:1 Backing: The total supply of AlphaCredit is always 1:1 backed by the $CHZ
 *   held in the main AlphaStakes contract's Reservoir.
 * - Non-Transferable: Users cannot transfer AC to each other. This prevents the formation
 *   of a secondary market and keeps the economy contained within the protocol, ensuring
 *   solvency.
 * - Controlled Supply: Only the owner of this contract (the AlphaStakes main contract)
 *   can mint (on deposit) or burn (on withdrawal) AC tokens.
 */
contract AlphaCredit is ERC20, Ownable {

    // --- Constructor ---
    /**
     * @dev The contract is deployed with the name "AlphaCredit" and symbol "AC".
     * The deployer is the initial owner, but ownership MUST be transferred to the
     * main AlphaStakes contract after deployment.
     */
    constructor() ERC20("AlphaCredit", "AC") Ownable(msg.sender) {}

    // --- Owner-Only Functions ---
    /**
     * @notice Mints new AC tokens and assigns them to a user.
     * @dev Only callable by the owner (the AlphaStakes contract). This is called when a
     * user deposits $CHZ into the protocol.
     * @param to The address to mint the tokens to.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Burns AC tokens from a user's balance.
     * @dev Only callable by the owner (the AlphaStakes contract). This is called when a
     * user withdraws their credit for real $CHZ.
     * @param from The address to burn the tokens from.
     * @param amount The amount of tokens to burn.
     */
    function burn(address from, uint256 amount) public onlyOwner {
        _burn(from, amount);
    }

    // --- Overridden ERC20 Functions ---
    /**
     * @dev Overrides the standard ERC20 transfer function to prevent user-to-user transfers.
     * This is a critical security and economic feature of the protocol.
     */
    function _transfer(address from, address to, uint256 amount) internal override {
        revert("AlphaCredit: Transfers are disabled");
    }
}