// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAlphaStakes {
    // --- Enums for clarity ---
    enum Outcome { TeamA, Draw, TeamB }

    // --- Events ---
    event Deposit(address indexed user, uint256 chzAmount, uint256 creditAmount);
    event Withdrawal(address indexed user, uint256 creditAmount, uint256 chzAmount);
    event StakePlaced(address indexed user, uint256 indexed matchId, uint256 creditAmount, Outcome prediction, bool isAlphaPool);
    event WinningsClaimed(address indexed user, uint256 indexed stakeId, uint256 creditWon);
    event MatchCreated(uint256 indexed matchId);
    event MatchResulted(uint256 indexed matchId, Outcome winningOutcome);

    // --- User-Facing Functions ---
    function depositChzForCredit() external payable;
    function withdrawCreditForChz(uint256 creditAmount) external;
    function placeStake(uint256 matchId, Outcome prediction, uint256 creditAmount, bool isAlphaPool) external;
    function claimWinnings(uint256 stakeId) external;

    // --- View Functions ---
    function getPayoutMultiplier(uint256 matchId, Outcome outcome, bool isAlphaPool) external view returns (uint256);
    function getUserInfo(address user) external view returns (uint256 creditBalance, uint256 totalStakes);
}