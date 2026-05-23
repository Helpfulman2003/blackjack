// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BlackjackLeaderboard
 * @notice On-chain leaderboard for Blackjack game on Base Mainnet
 */
contract BlackjackLeaderboard {

    // Admin & Fees
    address public owner;
    uint256 public gameStartFee = 0.0000003 ether; // ~$0.001 (300 Gwei)
    uint256 public gameEndFee = 0.0000003 ether;   // ~$0.001 (300 Gwei)

    struct PlayerStats {
        uint256 wins;
        uint256 losses;
        uint256 pushes;
        uint256 biggestWin;   // max chips won in a single hand
        uint256 totalGames;
        uint256 lastSubmit;
        string  nickname;
    }

    struct LeaderEntry {
        address player;
        string  nickname;
        uint256 wins;
        uint256 losses;
        uint256 pushes;
        uint256 biggestWin;
        uint256 timestamp;
    }

    // State
    mapping(address => PlayerStats) public players;
    LeaderEntry[10] public topPlayers;
    uint256 public totalPlayers;

    // Anti-spam
    uint256 public constant SUBMIT_COOLDOWN = 30 seconds;

    // Events
    event ResultSubmitted(address indexed player, string nickname, uint256 wins, uint256 losses, uint256 pushes);
    event LeaderboardUpdated(uint8 position, address player, uint256 wins);
    event GameStartPaid(address indexed player, uint256 amount);
    event GameEndPaid(address indexed player, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setFees(uint256 _startFee, uint256 _endFee) external onlyOwner {
        gameStartFee = _startFee;
        gameEndFee = _endFee;
    }

    function payGameStart() external payable {
        require(msg.value >= gameStartFee, "Insufficient start fee");
        emit GameStartPaid(msg.sender, msg.value);
    }

    function payGameEnd() external payable {
        require(msg.value >= gameEndFee, "Insufficient end fee");
        emit GameEndPaid(msg.sender, msg.value);
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        payable(owner).transfer(balance);
    }

    // ─── Public Functions ────────────────────────────────────────

    /**
     * @notice Submit game session result
     * @param wins    Number of hands won this session
     * @param losses  Number of hands lost this session
     * @param pushes  Number of hands tied this session
     * @param biggestWin Max chips won in single hand this session
     * @param nickname Display name (max 16 chars)
     */
    function submitResult(
        uint256 wins,
        uint256 losses,
        uint256 pushes,
        uint256 biggestWin,
        string calldata nickname
    ) external {
        require(wins + losses + pushes > 0,          "No games played");
        require(wins + losses + pushes <= 100,       "Too many games per session");
        require(bytes(nickname).length > 0 && bytes(nickname).length <= 16, "Invalid nickname");

        PlayerStats storage ps = players[msg.sender];

        require(
            block.timestamp >= ps.lastSubmit + SUBMIT_COOLDOWN,
            "Please wait before submitting again"
        );

        // First time player
        if (ps.totalGames == 0) {
            totalPlayers++;
        }

        ps.lastSubmit  = block.timestamp;
        ps.totalGames += wins + losses + pushes;
        ps.wins        += wins;
        ps.losses      += losses;
        ps.pushes      += pushes;
        ps.nickname    = nickname;
        if (biggestWin > ps.biggestWin) {
            ps.biggestWin = biggestWin;
        }

        emit ResultSubmitted(msg.sender, nickname, wins, losses, pushes);

        _updateLeaderboard(msg.sender, ps.wins, ps.losses, ps.pushes, ps.biggestWin, nickname);
    }

    /**
     * @notice Get top 10 players
     */
    function getTopPlayers() external view returns (LeaderEntry[10] memory) {
        return topPlayers;
    }

    /**
     * @notice Get a specific player's stats
     */
    function getPlayerStats(address player) external view returns (PlayerStats memory) {
        return players[player];
    }

    /**
     * @notice Get player's current rank (0 = not ranked)
     */
    function getPlayerRank(address player) external view returns (uint8) {
        for (uint8 i = 0; i < 10; i++) {
            if (topPlayers[i].player == player) return i + 1;
        }
        return 0;
    }

    // ─── Internal ────────────────────────────────────────────────

    function _updateLeaderboard(
        address player,
        uint256 wins,
        uint256 losses,
        uint256 pushes,
        uint256 biggestWin,
        string memory nickname
    ) internal {
        uint8 oldIdx   = 10;
        uint8 insertAt = 10;

        for (uint8 i = 0; i < 10; i++) {
            if (topPlayers[i].player == player) {
                oldIdx = i;
            }
            if (insertAt == 10 && wins > topPlayers[i].wins) {
                insertAt = i;
            }
        }

        if (insertAt == 10) {
            // Still update existing entry even if rank doesn't change
            if (oldIdx != 10) {
                topPlayers[oldIdx] = LeaderEntry(player, nickname, wins, losses, pushes, biggestWin, block.timestamp);
            }
            return;
        }

        if (oldIdx != 10) {
            if (insertAt < oldIdx) {
                for (uint8 j = oldIdx; j > insertAt; j--) {
                    topPlayers[j] = topPlayers[j - 1];
                }
                topPlayers[insertAt] = LeaderEntry(player, nickname, wins, losses, pushes, biggestWin, block.timestamp);
            } else {
                topPlayers[oldIdx] = LeaderEntry(player, nickname, wins, losses, pushes, biggestWin, block.timestamp);
            }
        } else {
            for (uint8 i = 9; i > insertAt; i--) {
                topPlayers[i] = topPlayers[i - 1];
            }
            topPlayers[insertAt] = LeaderEntry(player, nickname, wins, losses, pushes, biggestWin, block.timestamp);
        }

        emit LeaderboardUpdated(insertAt, player, wins);
    }
}
