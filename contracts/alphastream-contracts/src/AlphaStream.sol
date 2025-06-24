// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AlphaStakes Betting Contract
 * @author Your Name
 * @notice A proof-of-concept smart contract for a sports betting platform.
 * Users can place bets using an ERC20 token (e.g., Chiliz - $CHZ).
 * An owner is responsible for resolving bets and triggering payouts.
 */
contract AlphaStakes is Ownable {
    // The ERC20 token contract used for betting (e.g., Chiliz)
    IERC20 public immutable chilizToken;

    // Enum to clearly represent the status of a bet
    enum BetStatus { Open, Won, Lost, Canceled }

    /**
     * @notice This struct holds all the critical information for a single bet.
     * This is the "BetMetadata" you requested.
     */
    struct Bet {
        uint256 id;                 // Unique identifier for each bet
        address bettor;             // The address of the user who placed the bet
        string market;              // The category, e.g., "Market Pool", "Both Teams To Score"
        string selection;           // The user's choice, e.g., "Manchester City", "Yes"
        uint256 amount;             // The amount of CHZ tokens staked
        uint256 odds;               // The odds, stored as an integer. e.g., 1.70x is stored as 170.
        BetStatus status;           // The current status of the bet (Open, Won, Lost)
    }

    // A counter to ensure every bet gets a unique ID.
    uint256 private _nextBetId;

    // --- Mappings ---

    // Primary mapping from a unique bet ID to the Bet struct.
    // This is the most efficient way to look up and manage individual bets.
    mapping(uint256 => Bet) public bets;

    // Mapping from a user's address to an array of their bet IDs.
    // This directly satisfies your request to find all bets for a given user.
    mapping(address => uint256[]) public userBetIds;

    // --- Events ---

    event BetPlaced(
        uint256 indexed betId,
        address indexed bettor,
        string market,
        string selection,
        uint256 amount,
        uint256 odds
    );

    event BetResolved(uint256 indexed betId, address indexed bettor, BetStatus status, uint256 payout);


    /**
     * @notice Sets up the contract with the Chiliz token address and transfers ownership.
     * @param _chilizTokenAddress The address of the ERC20 token for betting.
     */
    constructor(address _chilizTokenAddress) Ownable(msg.sender) {
        require(_chilizTokenAddress != address(0), "Token address cannot be zero");
        chilizToken = IERC20(_chilizTokenAddress);
        _nextBetId = 1; // Start IDs from 1 for clarity
    }

    // --- Core Betting Functions ---

    /**
     * @notice Places a new bet. The user must have first approved the contract
     * to spend their Chiliz tokens.
     * @param _market The market/category of the bet (e.g., "Alpha Pool").
     * @param _selection The specific outcome selected (e.g., "Al Ain").
     * @param _odds The decimal odds multiplied by 100 (e.g., 5.20x becomes 520).
     * @param _amount The amount of Chiliz tokens to bet (in their smallest unit).
     */
    function placeBet(
        string memory _market,
        string memory _selection,
        uint256 _odds,
        uint256 _amount
    ) external {
        require(_amount > 0, "Bet amount must be greater than zero");
        require(_odds > 100, "Odds must be greater than 1.00x");

        uint256 betId = _nextBetId;

        // Create the Bet struct in memory first
        Bet memory newBet = Bet({
            id: betId,
            bettor: msg.sender,
            market: _market,
            selection: _selection,
            amount: _amount,
            odds: _odds,
            status: BetStatus.Open
        });

        // Store the bet in our mappings
        bets[betId] = newBet;
        userBetIds[msg.sender].push(betId);

        // Increment for the next bet
        _nextBetId++;

        // Pull the staked tokens from the user's wallet into this contract
        // IMPORTANT: The user must have called `approve(address(this), _amount)` on the
        // Chiliz token contract before calling this function.
        uint256 initialBalance = chilizToken.balanceOf(address(this));
        chilizToken.transferFrom(msg.sender, address(this), _amount);
        require(chilizToken.balanceOf(address(this)) == initialBalance + _amount, "Token transfer failed");

        emit BetPlaced(betId, msg.sender, _market, _selection, _amount, _odds);
    }


    // --- Owner/Admin Manipulation Functions ---

    /**
     * @notice Resolves a bet. Can only be called by the contract owner.
     * If the bet is a winner, it calculates and sends the payout.
     * @param _betId The ID of the bet to resolve.
     * @param _finalStatus The final status of the bet (Won, Lost, or Canceled).
     */
    function resolveBet(uint256 _betId, BetStatus _finalStatus) external onlyOwner {
        Bet storage betToResolve = bets[_betId];
        
        require(betToResolve.id != 0, "Bet does not exist");
        require(betToResolve.status == BetStatus.Open, "Bet is not open for resolution");
        require(_finalStatus != BetStatus.Open, "Final status cannot be Open");

        betToResolve.status = _finalStatus;
        uint256 payoutAmount = 0;

        if (_finalStatus == BetStatus.Won) {
            // Calculate payout: (amount * odds) / 100
            // The division by 100 corrects for storing odds as an integer (e.g., 170 -> 1.70x)
            payoutAmount = (betToResolve.amount * betToResolve.odds) / 100;
            chilizToken.transfer(betToResolve.bettor, payoutAmount);
        } else if (_finalStatus == BetStatus.Canceled) {
            // If canceled, just return the original stake
            payoutAmount = betToResolve.amount;
            chilizToken.transfer(betToResolve.bettor, payoutAmount);
        }
        // If Lost, payoutAmount remains 0 and no tokens are transferred back.

        emit BetResolved(_betId, betToResolve.bettor, _finalStatus, payoutAmount);
    }

    /**
     * @notice Allows the owner to withdraw a portion of the contract's token balance.
     * This could be used to collect the "house edge" or profits.
     * @param _amount The amount of tokens to withdraw.
     */
    function withdrawHouseFunds(uint256 _amount) external onlyOwner {
        require(chilizToken.balanceOf(address(this)) >= _amount, "Insufficient contract balance");
        chilizToken.transfer(owner(), _amount);
    }


    // --- Query/View Functions ---

    /**
     * @notice Retrieves all data for a single bet by its ID.
     * @param _betId The ID of the bet.
     * @return The complete Bet struct.
     */
    function getBetDetails(uint256 _betId) external view returns (Bet memory) {
        return bets[_betId];
    }

    /**
     * @notice Retrieves all bet IDs for a specific user.
     * Your frontend can then call `getBetDetails` for each ID to get the full data.
     * @param _user The address of the user.
     * @return An array of bet IDs.
     */
    function getBetsByUser(address _user) external view returns (uint256[] memory) {
        return userBetIds[_user];
    }

    /**
     * @notice Returns the contract's current balance of Chiliz tokens.
     */
    function getContractChilizBalance() external view returns (uint256) {
        return chilizToken.balanceOf(address(this));
    }
}