// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DrugTraceability {

    enum Role { None, Manufacturer, Lab, Distributor, Pharmacy }
    enum Stage { Manufactured, Tested, Distributed, InPharmacy }

    struct Batch {
        string batchId;
        string drugName;
        uint manufactureDate;
        uint expiryDate;
        address owner;
        bool testPassed;
        string ipfsHash;
        Stage stage;
    }

    struct Transfer {
        address from;
        address to;
        uint timestamp;
    }

    mapping(string => Batch) public batches;
    mapping(string => Transfer[]) public history;
    mapping(address => Role) public roles;

    address public admin;

    constructor() {
        admin = msg.sender;
    }

    modifier onlyRole(Role r) {
        require(roles[msg.sender] == r, "Not authorized");
        _;
    }

    function assignRole(address user, uint8 role) public {
        require(msg.sender == admin, "Only admin");
        roles[user] = Role(role);
    }

    function registerBatch(
        string memory id,
        string memory name,
        uint mDate,
        uint eDate
    ) public onlyRole(Role.Manufacturer) {

        // 🔥 Prevent overwrite
        require(bytes(batches[id].batchId).length == 0, "Batch already exists");

        batches[id] = Batch(
            id,
            name,
            mDate,
            eDate,
            msg.sender,
            false,
            "",
            Stage.Manufactured
        );
    }

    function submitTestResult(
        string memory id,
        bool passed,
        string memory hash
    ) public onlyRole(Role.Lab) {

        Batch storage b = batches[id];

        // 🔥 Ensure batch exists
        require(bytes(b.batchId).length != 0, "Batch not found");

        // 🔥 Allow:
        // 1. First test (Manufactured)
        // 2. Retest ONLY if previously failed
        require(
            b.stage == Stage.Manufactured ||
            (b.stage == Stage.Tested && b.testPassed == false),
            "Invalid stage"
        );

        b.testPassed = passed;
        b.ipfsHash = hash;

        // 🔥 If pass → move forward
        if (passed) {
            b.stage = Stage.Tested;
        } else {
            // 🔥 Stay in Manufactured to allow retry
            b.stage = Stage.Manufactured;
        }
    }

    function transferOwnership(
        string memory id,
        address to
    ) public {

        Batch storage b = batches[id];

        // 🔥 Ensure batch exists
        require(bytes(b.batchId).length != 0, "Batch not found");

        // 🔥 Only valid roles
        require(
            roles[msg.sender] == Role.Manufacturer ||
            roles[msg.sender] == Role.Distributor,
            "Not allowed"
        );

        // 🔥 Must pass test before transfer
        require(b.testPassed == true, "Test not passed");

        history[id].push(Transfer(msg.sender, to, block.timestamp));

        b.owner = to;

        if (roles[to] == Role.Distributor) {
            b.stage = Stage.Distributed;
        }

        if (roles[to] == Role.Pharmacy) {
            b.stage = Stage.InPharmacy;
        }
    }

    function getBatchDetails(string memory id)
        public view returns (
            string memory,
            string memory,
            uint,
            uint,
            address,
            bool,
            string memory,
            Stage
        )
    {
        Batch memory b = batches[id];
        return (
            b.batchId,
            b.drugName,
            b.manufactureDate,
            b.expiryDate,
            b.owner,
            b.testPassed,
            b.ipfsHash,
            b.stage
        );
    }

    function getBatchHistory(string memory id)
        public view returns (Transfer[] memory)
    {
        return history[id];
    }
}