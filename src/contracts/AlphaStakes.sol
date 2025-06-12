// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./IAlphaStakes.sol";
import "./Oracle.sol";
import "./AlphaCredit.sol";

/**
 * @title AlphaStakes
 * @author AlphaStakes Protocol
 * @notice This is the main logic contract for the AlphaStakes prediction market.
 * It orchestrates the entire economic loop of the protocol, from depositing $CHZ
 * to minting internal `AlphaCredit`, handling stakes, and processing withdrawals.
 *
 * ARCHITECTURAL OVERVIEW:
 * 1. Reservoir Model: All deposited $CHZ is held in a single contract balance (the Reservoir),
 *    providing shared liquidity across the entire platform.
 * 2. Internal Credit: All gameplay (staking, winning) uses `AlphaCredit` (AC), an internal,
 *    non-transferable token. This ensures the protocol's internal economy is always solvent.
 * 3. Fee Structure: A small, transparent platform fee is taken from each resolved match pool
 *    in the form of AC, creating a sustainable revenue stream for the protocol.
 * 4. Oracle Security: Match results are reported by a trusted, off-chain oracle, ensuring
 *    data integrity.
 */
contract AlphaStakes is IAlphaStakes, Oracle, ReentrancyGuard {

    // --- State Variables ---
    AlphaCredit public immutable alphaCredit;
    uint256 public platformFeeBps; // Platform fee in basis points (e.g., 400 = 4.00%)
    uint256 public totalPlatformFeeCredit; // Total AC fees earned by the platform

    // --- Structs ---
    enum MatchStatus { Upcoming, Ended, Canceled }

    struct Pool {
        uint256 totalStaked;
        mapping(Outcome => uint256) stakesByOutcome;
    }

    struct Match {
        uint256 externalMatchId; // The ID from the external sports API
        MatchStatus status;
        Pool marketPool;
        Pool alphaPool;
        Outcome winningOutcome;
    }

    struct Stake {
        uint256 stakeId;
        uint256 matchId;
        address user;
        uint256 amount; // Amount in AlphaCredit
        Outcome prediction;
        bool isAlphaPool;
        bool isClaimed;
    }

    // --- Mappings ---
    mapping(uint256 => Match) public matches;
    mapping(uint256 => Stake) public allStakes;
    mapping(address => uint256[]) public userStakeIds;
    uint256 public nextStakeId;

    // --- Constructor ---
    constructor(
        address _initialOracle,
        address _alphaCreditAddress,
        uint256 _initialPlatformFeeBps
    ) Oracle(_initialOracle) {
        alphaCredit = AlphaCredit(_alphaCreditAddress);
        platformFeeBps = _initialPlatformFeeBps;
    }

    // ==================================================================
    //                     ECONOMIC CORE FUNCTIONS
    // ==================================================================

    /**
     * @notice User deposits $CHZ to receive an equivalent amount of AlphaCredit (AC).
     * @dev This is the primary entry point for value into the protocol.
     */
    function depositChzForCredit() external payable override nonReentrant {
        uint256 amount = msg.value;
        require(amount > 0, "Deposit amount must be positive");
        alphaCredit.mint(msg.sender, amount);
        emit Deposit(msg.sender, amount, amount);
    }

    /**
     * @notice User burns their AlphaCredit (AC) to withdraw an equivalent amount of $CHZ.
     * @dev This is the primary exit point for value from the protocol.
     * @param creditAmount The amount of AC the user wishes to withdraw.
     */
    function withdrawCreditForChz(uint256 creditAmount) external override nonReentrant {
        require(creditAmount > 0, "Withdrawal amount must be positive");
        require(alphaCredit.balanceOf(msg.sender) >= creditAmount, "Insufficient credit balance");
        require(address(this).balance >= creditAmount, "Insufficient contract liquidity (Reservoir)");

        alphaCredit.burn(msg.sender, creditAmount);
        (bool success, ) = msg.sender.call{value: creditAmount}("");
        require(success, "CHZ transfer failed");

        emit Withdrawal(msg.sender, creditAmount, creditAmount);
    }

    // ==================================================================
    //                        GAMEPLAY FUNCTIONS
    // ==================================================================

    /**
     * @notice Places a stake on a match outcome using AlphaCredit.
     * @param matchId The ID of the match to stake on.
     * @param prediction The user's predicted outcome.
     * @param creditAmount The amount of AC to stake.
     * @param isAlphaPool True if staking in the Alpha Pool, false for Market Pool.
     */
    function placeStake(uint256 matchId, Outcome prediction, uint256 creditAmount, bool isAlphaPool) external override nonReentrant {
        require(creditAmount > 0, "Stake amount must be positive");
        require(alphaCredit.balanceOf(msg.sender) >= creditAmount, "Insufficient credit for stake");

        Match storage currentMatch = matches[matchId];
        require(currentMatch.status == MatchStatus.Upcoming, "Staking is not open");

        // Transfer credit from user to this contract (escrow)
        alphaCredit.burn(msg.sender, creditAmount); // Temporarily burn user's credit
        // This is a simplified model; a more complex one might transfer to the contract itself.
        // For now, burning and re-minting on win/loss is clear.

        Pool storage selectedPool = isAlphaPool ? currentMatch.alphaPool : currentMatch.marketPool;
        selectedPool.totalStaked += creditAmount;
        selectedPool.stakesByOutcome[prediction] += creditAmount;

        uint256 stakeId = nextStakeId++;
        allStakes[stakeId] = Stake({
            stakeId: stakeId,
            matchId: matchId,
            user: msg.sender,
            amount: creditAmount,
            prediction: prediction,
            isAlphaPool: isAlphaPool,
            isClaimed: false
        });
        userStakeIds[msg.sender].push(stakeId);

        emit StakePlaced(msg.sender, matchId, creditAmount, prediction, isAlphaPool);
    }

    /**
     * @notice Claims winnings for a specific stake.
     * @dev This function calculates the payout in AC and credits the user's balance.
     * @param stakeId The ID of the stake to be claimed.
     */
    function claimWinnings(uint256 stakeId) external override nonReentrant {
        Stake storage userStake = allStakes[stakeId];
        require(userStake.user == msg.sender, "Not your stake");
        require(!userStake.isClaimed, "Stake already claimed");

        Match storage currentMatch = matches[userStake.matchId];
        require(currentMatch.status == MatchStatus.Ended, "Match has not ended");
        require(userStake.prediction == currentMatch.winningOutcome, "Prediction was incorrect");

        userStake.isClaimed = true;

        Pool storage selectedPool = userStake.isAlphaPool ? currentMatch.alphaPool : currentMatch.marketPool;
        uint256 totalWinningStakes = selectedPool.stakesByOutcome[currentMatch.winningOutcome];
        
        // The pot available for winners is the total staked in the pool, minus the platform fee.
        uint256 feeAmount = (selectedPool.totalStaked * platformFeeBps) / 10000;
        uint256 potAfterFee = selectedPool.totalStaked - feeAmount;

        // Payout = (Pot After Fee / Total Winning Stakes) * User's Stake
        uint256 payout = (potAfterFee * userStake.amount) / totalWinningStakes;

        // Mint the winning credit back to the user
        alphaCredit.mint(msg.sender, payout);

        emit WinningsClaimed(msg.sender, stakeId, payout);
    }

    // ==================================================================
    //                       ORACLE & ADMIN FUNCTIONS
    // ==================================================================

    function createMatch(uint256 _externalMatchId) external onlyOracle {
        uint256 matchId = _externalMatchId;
        require(matches[matchId].externalMatchId == 0, "Match already exists");
        matches[matchId] = Match({
            externalMatchId: _externalMatchId,
            status: MatchStatus.Upcoming,
            winningOutcome: Outcome.Draw // Default
        });
        emit MatchCreated(matchId);
    }

    function resultMatch(uint256 matchId, Outcome winningOutcome) external onlyOracle {
        Match storage currentMatch = matches[matchId];
        require(currentMatch.status == MatchStatus.Upcoming, "Match not upcoming");
        currentMatch.status = MatchStatus.Ended;
        currentMatch.winningOutcome = winningOutcome;

        // Calculate and collect platform fees in AC
        uint256 marketFee = (currentMatch.marketPool.totalStaked * platformFeeBps) / 10000;
        uint256 alphaFee = (currentMatch.alphaPool.totalStaked * platformFeeBps) / 10000;
        totalPlatformFeeCredit += marketFee + alphaFee;

        emit MatchResulted(matchId, winningOutcome);
    }

    function withdrawPlatformFees() external onlyOwner nonReentrant {
        uint256 feesToWithdraw = totalPlatformFeeCredit;
        require(feesToWithdraw > 0, "No fees to withdraw");
        require(address(this).balance >= feesToWithdraw, "Insufficient contract liquidity for fee withdrawal");
        
        totalPlatformFeeCredit = 0;
        (bool success, ) = owner().call{value: feesToWithdraw}("");
        require(success, "Fee withdrawal failed");
    }

    function setPlatformFee(uint256 _newFeeBps) external onlyOwner {
        require(_newFeeBps <= 1000, "Fee cannot exceed 10%"); // Safety cap
        platformFeeBps = _newFeeBps;
    }

    // ==================================================================
    //                           VIEW FUNCTIONS
    // ==================================================================

    function getPayoutMultiplier(uint256 matchId, Outcome outcome, bool isAlphaPool) external view override returns (uint256) {
        Match storage currentMatch = matches[matchId];
        if (currentMatch.status != MatchStatus.Upcoming) return 0;

        Pool storage pool = isAlphaPool ? currentMatch.alphaPool : currentMatch.marketPool;
        uint256 totalWinningStakes = pool.stakesByOutcome[outcome];
        uint256 totalPoolStakes = pool.totalStaked;

        if (totalWinningStakes == 0) return 100; // 1x payout if no one has bet

        uint256 feeAmount = (totalPoolStakes * platformFeeBps) / 10000;
        uint256 potAfterFee = totalPoolStakes - feeAmount;

        // Multiplier is returned scaled by 100 (e.g., 250 = 2.50x)
        return (potAfterFee * 100) / totalWinningStakes;
    }

    function getUserInfo(address user) external view override returns (uint256 creditBalance, uint256 totalStakes) {
        return (alphaCredit.balanceOf(user), userStakeIds[user].length);
    }
}