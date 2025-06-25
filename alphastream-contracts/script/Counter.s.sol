// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

// Import the contracts you want to deploy
import {AlphaStream} from "../src/AlphaStream.sol";
import {AlphaStakes} from "../src/AlphaStakes.sol";

/**
 * @title Deployment Script for AlphaStakes Ecosystem
 * @notice This script handles the multi-step deployment:
 * 1. Deploys the AlphaStream (APS) reward token.
 * 2. Deploys the AlphaStakes betting contract, linking it to the APS token.
 * 3. Funds the AlphaStakes contract with an initial pool of APS reward tokens.
 */
contract DeployAlphaStakes is Script {
    
    function run() external returns (AlphaStakes, AlphaStream) {
        // --- Configuration ---
        // Load variables from your .env file for security and flexibility.
        address chilizTokenAddress = vm.envAddress("CHILIZ_TOKEN_ADDRESS");
        uint256 consolationPercentage = vm.envUint("CONSOLATION_PERCENTAGE");
        uint256 rewardPoolAmount = vm.envUint("APS_REWARD_POOL_AMOUNT");
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Use the private key to derive the deployer's address
        address deployerAddress = vm.addr(deployerPrivateKey);
        console.log("Deploying contracts with account:", deployerAddress);
        console.log("Using Chiliz Token at:", chilizTokenAddress);
        console.log("Initial Consolation Percentage:", consolationPercentage, "%");

        // Start broadcasting transactions to the network
        vm.startBroadcast(deployerPrivateKey);

        // --- 1. Deploy AlphaStream (APS) Token ---
        // The deployer will receive the total supply
        AlphaStream alphaStreamToken = new AlphaStream(deployerAddress);
        console.log("AlphaStream (APS) token deployed to:", address(alphaStreamToken));

        // --- 2. Deploy AlphaStakes Betting Contract ---
        // Pass the required addresses and config to its constructor
        AlphaStakes alphaStakesContract = new AlphaStakes(
            chilizTokenAddress,
            address(alphaStreamToken),
            consolationPercentage
        );
        console.log("AlphaStakes contract deployed to:", address(alphaStakesContract));

        // --- 3. Fund the AlphaStakes Contract with APS Rewards ---
        console.log("Funding AlphaStakes contract with", rewardPoolAmount / (10**18), "APS tokens...");
        // The deployer (who owns all APS) transfers tokens to the betting contract
        alphaStreamToken.transfer(address(alphaStakesContract), rewardPoolAmount);
        
        console.log("Funding complete. APS balance of AlphaStakes:", alphaStreamToken.balanceOf(address(alphaStakesContract)));

        // Stop broadcasting
        vm.stopBroadcast();
        
        // Return the deployed contract instances for further scripting or testing
        return (alphaStakesContract, alphaStreamToken);
    }
}