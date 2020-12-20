// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

/**
 * DAO (closed-end funds: investors can only invest at the beginning during a specific period)
 * 1. Collect investors money (ETH)
 * 2. Keep track of investor contributions with shares
 * 3. Allow investors to transfer shares
 * 4. Allow investment proposals to be created and voted
 * 5. Execute successful investment proposals (i.e.: send money)
 */

contract DAO {
    mapping(address => bool) public investors;
    mapping(address => uint256) public shares;
    uint256 public totalShares;
    uint256 public availableFunds;
    uint256 public contributionEnd;

    constructor(uint contributionTime) public {
        contributionEnd = block.timestamp + contributionTime;
    }

    function contribute() payable external {
        require(block.timestamp < contributionEnd, 'cannot contribute after contributionEnd');
        investors[msg.sender] = true;
        shares[msg.sender] += msg.value;    // 1 wei = 1 share
        totalShares += msg.value;
        availableFunds += msg.value;
    }
}
