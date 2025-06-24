// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AlphaStakes Betting Contract (v3 - Batch Resolution)
 * @author Your Name
 * @notice A betting platform using a dual-token model.
 * - Bets are placed in Chiliz ($CHZ).
 * - Winning bets are paid out in Chiliz ($CHZ).
 * - Losing bets receive a consolation prize in AlphaStream ($APS) tokens.
 * This version includes a batch resolution function for efficient, automated settlement.
 */
contract AlphaStakes is Ownable {
    // === STATE VARIABLES ===

    IERC20 public immutable chilizToken;        // For placing bets and winning payouts
    IERC20 public immutable alphaStreamToken;   // For consolation prizes on lost bets

    // NEW: Percentage of stake returned as consolation prize on a loss (e.g., 10 for 10%)
    uint256 public consolationPercentage;

    enum BetStatus { Open, Won, Lost, Canceled }

    struct Bet {
        uint256 id;
        address bettor;
        string market;
        string selection;
        uint256 amount;     // Amount is in Chiliz tokens
        uint256 odds;       // e.g., 1.70x is stored as 170
        BetStatus status;
    }

    uint256 private _nextBetId;
    mapping(uint256 => Bet) public bets;
    mapping(address => uint256[]) public userBetIds;

    // === EVENTS ===

    event BetPlaced(
        uint256 indexed betId,
        address indexed bettor,
        string market,
        string selection,
        uint256 amount,
        uint256 odds
    );

    event BetResolved(
        uint256 indexed betId,
        address indexed bettor,
        BetStatus status,
        uint256 payout,
        address indexed token
    );

    // NEW: Event for when the consolation prize percentage is updated
    event ConsolationPercentageSet(uint256 newPercentage);


    // === CONSTRUCTOR ===

    constructor(
        address _chilizTokenAddress,
        address _alphaStreamTokenAddress,
        uint256 _initialConsolationPercentage
    ) Ownable(msg.sender) {
        require(_chilizTokenAddress != address(0), "Betting token address cannot be zero");
        require(_alphaStreamTokenAddress != address(0), "Reward token address cannot be zero");
        
        chilizToken = IERC20(_chilizTokenAddress);
        alphaStreamToken = IERC20(_alphaStreamTokenAddress);

        // Set the initial consolation percentage
        setConsolationPercentage(_initialConsolationPercentage);

        _nextBetId = 1;
    }


    // === CORE BETTING FUNCTION (Unchanged) ===

    function placeBet(
        string memory _market,
        string memory _selection,
        uint256 _odds,
        uint256 _amount
    ) external {
        require(_amount > 0, "Bet amount must be greater than zero");
        require(_odds > 100, "Odds must be greater than 1.00x");

        uint256 betId = _nextBetId;
        bets[betId] = Bet({
            id: betId,
            bettor: msg.sender,
            market: _market,
            selection: _selection,
            amount: _amount,
            odds: _odds,
            status: BetStatus.Open
        });
        userBetIds[msg.sender].push(betId);
        _nextBetId++;

        chilizToken.transferFrom(msg.sender, address(this), _amount);
        emit BetPlaced(betId, msg.sender, _market, _selection, _amount, _odds);
    }


    // === OWNER/ADMIN FUNCTIONS ===

    /**
     * @notice NEW: The protected endpoint to resolve multiple bets in a single transaction.
     * This is the "house" function that updates results and sends prizes.
     * @param _betIds An array of bet IDs to resolve.
     * @param _finalStatuses An array of the final status for each corresponding bet ID.
     */
    function resolveBetsBatch(
        uint256[] memory _betIds,
        BetStatus[] memory _finalStatuses
    ) external onlyOwner {
        require(_betIds.length == _finalStatuses.length, "Input arrays must have the same length");
        require(_betIds.length > 0, "Cannot process an empty batch");

        for (uint256 i = 0; i < _betIds.length; i++) {
            uint256 betId = _betIds[i];
            BetStatus finalStatus = _finalStatuses[i];
            Bet storage betToResolve = bets[betId];

            // --- Validation for each bet in the batch ---
            // We use 'if/continue' instead of 'require' to prevent one bad bet
            // from reverting the entire valid batch.
            if (betToResolve.id == 0 || betToResolve.status != BetStatus.Open || finalStatus == BetStatus.Open) {
                // Skip invalid or already resolved bets
                continue;
            }

            betToResolve.status = finalStatus;
            uint256 payoutAmount = 0;
            address payoutToken = address(0);

            if (finalStatus == BetStatus.Won) {
                // WINNER: Gets back stake + winnings in CHZ
                payoutAmount = (betToResolve.amount * betToResolve.odds) / 100;
                payoutToken = address(chilizToken);
                
                // Ensure the contract has enough CHZ to pay out
                if (chilizToken.balanceOf(address(this)) >= payoutAmount) {
                    chilizToken.transfer(betToResolve.bettor, payoutAmount);
                }
            } else if (finalStatus == BetStatus.Lost) {
                // LOSER: Gets a consolation prize in APS tokens
                if (consolationPercentage > 0) {
                    payoutAmount = (betToResolve.amount * consolationPercentage) / 100;
                    payoutToken = address(alphaStreamToken);

                    // Ensure the contract has enough APS reward tokens
                    if (alphaStreamToken.balanceOf(address(this)) >= payoutAmount) {
                       alphaStreamToken.transfer(betToResolve.bettor, payoutAmount);
                    }
                }
            } else if (finalStatus == BetStatus.Canceled) {
                // CANCELED: Gets original stake back in CHZ
                payoutAmount = betToResolve.amount;
                payoutToken = address(chilizToken);

                if (chilizToken.balanceOf(address(this)) >= payoutAmount) {
                    chilizToken.transfer(betToResolve.bettor, payoutAmount);
                }
            }

            emit BetResolved(betId, betToResolve.bettor, finalStatus, payoutAmount, payoutToken);
        }
    }

    /**
     * @notice NEW: Allows the owner to configure the consolation prize percentage.
     * @param _newPercentage The new percentage (e.g., 10 for 10%). Max 100.
     */
    function setConsolationPercentage(uint256 _newPercentage) public onlyOwner {
        require(_newPercentage <= 100, "Percentage cannot exceed 100");
        consolationPercentage = _newPercentage;
        emit ConsolationPercentageSet(_newPercentage);
    }
    
    /**
     * @notice Allows the owner to withdraw the house's profit (un-refunded Chiliz tokens).
     */
    function withdrawHouseFunds(uint256 _amount) external onlyOwner {
        require(chilizToken.balanceOf(address(this)) >= _amount, "Insufficient house CHZ balance");
        chilizToken.transfer(owner(), _amount);
    }

    /**
     * @notice Allows the owner to withdraw any excess consolation prize tokens (APS).
     * Also used for topping up the reward pool (by sending APS *to* this contract).
     */
    function withdrawRewardTokens(uint256 _amount) external onlyOwner {
        require(alphaStreamToken.balanceOf(address(this)) >= _amount, "Insufficient reward token balance");
        alphaStreamToken.transfer(owner(), _amount);
    }


    // === QUERY/VIEW FUNCTIONS (Unchanged, but added one) ===
    function getBetDetails(uint256 _betId) external view returns (Bet memory) { return bets[_betId]; }
    function getBetsByUser(address _user) external view returns (uint256[] memory) { return userBetIds[_user]; }
    function getContractBettingTokenBalance() external view returns (uint256) { return chilizToken.balanceOf(address(this)); }
    function getContractRewardTokenBalance() external view returns (uint256) { return alphaStreamToken.balanceOf(address(this)); }
}