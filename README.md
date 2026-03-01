# Drug Traceability and Testability System

## Overview

A blockchain-based pharmaceutical supply chain system built using Solidity and Hardhat.

The system ensures secure drug batch registration, lab validation enforcement, and immutable ownership tracking.

---

## Problem Statement

Counterfeit drugs and tampered lab reports pose significant risks in pharmaceutical supply chains. Traditional systems lack transparency and tamper resistance.

---

## Solution

A decentralized smart contract system that:

- Registers drug batches
- Enforces lab test approval
- Tracks ownership transfers
- Maintains immutable audit history

---

## Tech Stack

- Solidity
- Hardhat
- Ethereum (Sepolia + Local Network)
- Ethers.js
- Node.js

---

## System Roles

- Admin
- Manufacturer
- Lab
- Distributor
- Pharmacy

---

## Lifecycle States

0 → Manufactured  
1 → Tested  
2 → Distributed  
3 → InPharmacy  

---

## Features

- Role-Based Access Control
- Drug Batch Registration
- Lab Test Enforcement
- Transfer Restrictions Before Testing
- Ownership Tracking
- Immutable Audit Trail
- Automated Demo Script

---

## Running the Project

### Install Dependencies

```bash
npm install


### Compile Smart Contracts
npx hardhat compile
Run Automated Demo
npx hardhat run scripts/demo.cjs

This will:

Deploy contract

Assign roles

Register batch

Submit lab result

Transfer ownership

Display final state and audit history

Why Hardhat Local Network Was Used

Deploying each actor on Sepolia would require multiple funded wallets and manual account switching.
For efficient academic demonstration, Hardhat local network was used to simulate multiple actors without real gas costs.

### Future Enhancements

React Frontend Dashboard

QR Code Integration

Real IPFS Report Upload

Blockchain Explorer UI

---
### Version
Backend Stable v1.0