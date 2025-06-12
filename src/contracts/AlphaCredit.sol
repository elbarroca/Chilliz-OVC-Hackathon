// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title AlphaStakes
 * @author Your Name
 * @notice A decentralized SportFi prediction market on the Chiliz Chain.
 * It facilitates staking on sports match outcomes through two distinct pools:
 * 1. Market Pool: Odds are driven by the collective stakes of the community.
 * 2. Alpha Pool: Odds are influenced by a proprietary data model (the Alpha Engine).
 * This contract operates on a credit-based system to manage liquidity efficiently.
 */
contract AlphaStakes is Ownable, ReentrancyGuard {

    // ==================================================================
    //                           STATE VARIABLES
    // ==================================================================

    address public trustedOracle;

    // --- Structs ---
    enum Outcome { TeamA, Draw, TeamB }
    enum MatchStatus { Upcoming, Ended, Canceled }

    struct Pool {
        uint256 totalStaked;
        mapping(Outcome => uint256) stakesByOutcome;
    }

    struct Match {
        uint256 externalMatchId;
        MatchStatus status;
        Pool marketPool;
        Pool alphaPool;
        Outcome winningOutcome;
    }

    struct Stake {
        uint256 matchId;
        address user;
        uint256 amount;
        Outcome prediction;
        bool isAlphaPool;
    }

    // --- Mappings ---
    mapping(uint256 => Match) public matches;
    mapping(address => uint256) public winningsCredit; // Tracks withdrawable winnings for each user
    
    // Array to keep track of all stakes for a user (optional, for off-chain convenience)
    mapping(address => Stake[]) private userStakes;

    // --- Events ---
    event MatchCreated(uint256 indexed matchId, uint256 externalMatchId);
    event MatchResulted(uint256 indexed matchId, Outcome winningOutcome);
    event StakePlaced(address indexed user, uint256 indexed matchId, uint256 amount, Outcome prediction, bool isAlphaPool);
    event WinningsWithdrawn(address indexed user, uint256 amount);
    event CreditAwarded(address indexed user, uint256 amount);

    // --- Modifiers ---
    modifier onlyOracle() {
        require(msg.sender == trustedOracle, "Caller is not the trusted oracle");
        _;
    }

    // ==================================================================
    //                           CONSTRUCTOR
    // ==================================================================

    constructor(address initialOracle) Ownable(msg.sender) {
        trustedOracle = initialOracle;
    }

    // ==================================================================
    //                        ADMIN & ORACLE FUNCTIONS
    // ==================================================================

    /**
     * @notice Sets the address of the trusted oracle.
     * @param _newOracle The address of the new oracle.
     */
    function setOracle(address _newOracle) public onlyOwner {
        trustedOracle = _newOracle;
    }

    /**
     * @notice Creates a new match, making it available for staking.
     * @param _externalMatchId The ID from the external sports API (e.g., API-Football).
     */
    function createMatch(uint256 _externalMatchId) public onlyOracle {
        uint256 matchId = _externalMatchId; // Use the external ID as the primary key
        require(matches[matchId].status == MatchStatus.Upcoming && matches[matchId].externalMatchId == 0, "Match already exists or ID is zero");

        matches[matchId].externalMatchId = _externalMatchId;
        matches[matchId].status = MatchStatus.Upcoming;
        
        emit MatchCreated(matchId, _externalMatchId);
    }

    /**
     * @notice Records the result of a match and calculates winnings.
     * @param _matchId The ID of the match to be resulted.
     * @param _winningOutcome The final outcome of the match (TeamA, Draw, or TeamB).
     */
    function resultMatch(uint256 _matchId, Outcome _winningOutcome) public onlyOracle nonReentrant {
        Match storage currentMatch = matches[_matchId];
        require(currentMatch.status == MatchStatus.Upcoming, "Match not available for resulting");

        currentMatch.status = MatchStatus.Ended;
        currentMatch.winningOutcome = _winningOutcome;

        // Since this is a credit system, we don't distribute funds here.
        // We simply mark the match as ended. The credit calculation happens
        // when a user claims their winnings.
        emit MatchResulted(_matchId, _winningOutcome);
    }

    // ==================================================================
    //                           USER FUNCTIONS
    // ==================================================================

    /**
     * @notice Allows a user to stake CHZ on a match outcome.
     * @param _matchId The ID of the match to stake on.
     * @param _prediction The user's predicted outcome.
     * @param _isAlphaPool True if staking in the Alpha Pool, false for Market Pool.
     */
    function placeStake(uint256 _matchId, Outcome _prediction, bool _isAlphaPool) public payable nonReentrant {
        require(msg.value > 0, "Stake amount must be greater than zero");
        Match storage currentMatch = matches[_matchId];
        require(currentMatch.status == MatchStatus.Upcoming, "Staking is not open for this match");

        Pool storage selectedPool = _isAlphaPool ? currentMatch.alphaPool : currentMatch.marketPool;

        // Update pool state
        selectedPool.totalStaked += msg.value;
        selectedPool.stakesByOutcome[_prediction] += msg.value;

        // Record the user's stake details
        userStakes[msg.sender].push(Stake({
            matchId: _matchId,
            user: msg.sender,
            amount: msg.value,
            prediction: _prediction,
            isAlphaPool: _isAlphaPool
        }));

        emit StakePlaced(msg.sender, _matchId, msg.value, _prediction, _isAlphaPool);
    }

    /**
     * @notice Allows a user to claim winnings for a specific stake and have it added to their credit.
     * @param _stakeIndex The index of the stake in the user's stake history.
     */
    function claimWinnings(uint256 _stakeIndex) public nonReentrant {
        require(_stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        
        Stake memory userStake = userStakes[msg.sender][_stakeIndex];
        Match storage currentMatch = matches[userStake.matchId];

        require(currentMatch.status == MatchStatus.Ended, "Match has not ended yet");
        require(userStake.prediction == currentMatch.winningOutcome, "Prediction was incorrect");
        require(userStake.amount > 0, "Stake already processed"); // Prevent double claims

        Pool storage selectedPool = userStake.isAlphaPool ? currentMatch.alphaPool : currentMatch.marketPool;
        
        uint256 totalWinningStakes = selectedPool.stakesByOutcome[currentMatch.winningOutcome];
        require(totalWinningStakes > 0, "No winning stakes in this pool");

        // Calculate payout: (Total Pool Staked / Total Winning Stakes) * User's Stake
        uint256 payout = (selectedPool.totalStaked * userStake.amount) / totalWinningStakes;

        // Mark this stake as processed by zeroing out the amount
        userStakes[msg.sender][_stakeIndex].amount = 0;

        // Add the payout to the user's withdrawable credit
        winningsCredit[msg.sender] += payout;
        
        emit CreditAwarded(msg.sender, payout);
    }

    /**
     * @notice Allows a user to withdraw their available CHZ credit.
     */
    function withdrawCredit() public nonReentrant {
        uint256 amountToWithdraw = winningsCredit[msg.sender];
        require(amountToWithdraw > 0, "No credit to withdraw");
        require(address(this).balance >= amountToWithdraw, "Insufficient contract balance for withdrawal");

        winningsCredit[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: amountToWithdraw}("");
        require(success, "Withdrawal failed");

        emit WinningsWithdrawn(msg.sender, amountToWithdraw);
    }

    // ==================================================================
    //                           VIEW FUNCTIONS
    // ==================================================================

    /**
     * @notice Calculates the current payout multiplier for a potential stake.
     * @dev This is a view function and does not cost gas to call.
     * @param _matchId The ID of the match.
     * @param _outcome The potential outcome to check.
     * @param _isAlphaPool True for Alpha Pool, false for Market Pool.
     * @return The payout multiplier, scaled by 100 (e.g., 250 means 2.50x).
     */
    function getPayoutMultiplier(uint256 _matchId, Outcome _outcome, bool _isAlphaPool) public view returns (uint256) {
        Match storage currentMatch = matches[_matchId];
        if (currentMatch.status != MatchStatus.Upcoming) {
            return 0;
        }

        Pool storage selectedPool = _isAlphaPool ? currentMatch.alphaPool : currentMatch.marketPool;
        
        uint256 totalWinningStakes = selectedPool.stakesByOutcome[_outcome];
        uint256 totalStaked = selectedPool.totalStaked;

        // If no one has bet on this outcome yet, the first bettor gets the whole pool
        if (totalWinningStakes == 0) {
            // To prevent division by zero, we return the total staked so far.
            // The UI should handle this case and show a potentially high multiplier.
            return (totalStaked > 0) ? (totalStaked * 100) / 1 : 100; // Default to 1x if pool is empty
        }

        // Multiplier = Total Pool / Total Winning Stakes
        return (totalStaked * 100) / totalWinningStakes;
    }

    /**
     * @notice Gets the details of a user's stake.
     */
    function getUserStake(address _user, uint256 _index) public view returns (Stake memory) {
        return userStakes[_user][_index];
    }

    /**
     * @notice Gets the number of stakes a user has made.
     */
    function getUserStakeCount(address _user) public view returns (uint256) {
        return userStakes[_user].length;
    }
}