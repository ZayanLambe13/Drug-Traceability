// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DrugTraceability {

    address public admin;

    constructor() {
        admin = msg.sender;
    }

    // ---------------- ENUMS ----------------

    enum Role { None, Manufacturer, Lab, Distributor, Pharmacy }
    enum Status { Manufactured, Tested, Distributed, InPharmacy }

    // ---------------- STRUCTS ----------------

    struct Batch {
        string batchId;
        string drugName;
        uint256 manufactureDate;
        uint256 expiryDate;
        address currentOwner;
        bool testPassed;
        string ipfsHash;
        Status status;
        bool exists;
    }

    struct TransferRecord {
        address from;
        address to;
        uint256 timestamp;
    }

    // ---------------- STORAGE ----------------

    mapping(string => Batch) public batches;
    mapping(address => Role) public roles;
    mapping(string => TransferRecord[]) public batchHistory;

    // ---------------- EVENTS ----------------

    event RoleAssigned(address indexed user, Role role);
    event BatchRegistered(string batchId, address manufacturer);
    event TestSubmitted(string batchId, bool status);
    event OwnershipTransferred(string batchId, address from, address to);

    // ---------------- MODIFIERS ----------------

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyRole(Role _role) {
        require(roles[msg.sender] == _role, "Unauthorized role");
        _;
    }

    // ---------------- ROLE MANAGEMENT ----------------

    function assignRole(address _user, Role _role) public onlyAdmin {
        roles[_user] = _role;
        emit RoleAssigned(_user, _role);
    }

    // ---------------- BATCH REGISTRATION ----------------

    function registerBatch(
        string memory _batchId,
        string memory _drugName,
        uint256 _manufactureDate,
        uint256 _expiryDate
    ) public onlyRole(Role.Manufacturer) {

        require(!batches[_batchId].exists, "Batch exists");

        batches[_batchId] = Batch({
            batchId: _batchId,
            drugName: _drugName,
            manufactureDate: _manufactureDate,
            expiryDate: _expiryDate,
            currentOwner: msg.sender,
            testPassed: false,
            ipfsHash: "",
            status: Status.Manufactured,
            exists: true
        });

        emit BatchRegistered(_batchId, msg.sender);
    }

    // ---------------- LAB TEST ----------------

    function submitTestResult(
        string memory _batchId,
        bool _status,
        string memory _ipfsHash
    ) public onlyRole(Role.Lab) {

        require(batches[_batchId].exists, "Batch not found");

        batches[_batchId].testPassed = _status;
        batches[_batchId].ipfsHash = _ipfsHash;
        batches[_batchId].status = Status.Tested;

        emit TestSubmitted(_batchId, _status);
    }

    // ---------------- OWNERSHIP TRANSFER ----------------

    function transferOwnership(
        string memory _batchId,
        address _newOwner
    ) public {

        require(batches[_batchId].exists, "Batch not found");
        require(msg.sender == batches[_batchId].currentOwner, "Not owner");

        // Prevent distribution if test failed
        require(batches[_batchId].testPassed == true, "Batch not approved");

        batchHistory[_batchId].push(
            TransferRecord(msg.sender, _newOwner, block.timestamp)
        );

        batches[_batchId].currentOwner = _newOwner;

        // Update lifecycle
        if (roles[_newOwner] == Role.Distributor) {
            batches[_batchId].status = Status.Distributed;
        } else if (roles[_newOwner] == Role.Pharmacy) {
            batches[_batchId].status = Status.InPharmacy;
        }

        emit OwnershipTransferred(_batchId, msg.sender, _newOwner);
    }

    // ---------------- VIEW FUNCTIONS ----------------

    function getBatchDetails(string memory _batchId)
        public
        view
        returns (
            string memory,
            string memory,
            uint256,
            uint256,
            address,
            bool,
            string memory,
            Status
        )
    {
        require(batches[_batchId].exists, "Batch not found");

        Batch memory b = batches[_batchId];

        return (
            b.batchId,
            b.drugName,
            b.manufactureDate,
            b.expiryDate,
            b.currentOwner,
            b.testPassed,
            b.ipfsHash,
            b.status
        );
    }

    function getBatchHistory(string memory _batchId)
        public
        view
        returns (TransferRecord[] memory)
    {
        return batchHistory[_batchId];
    }
}