# 💊 Drug Traceability DApp

A full-stack blockchain-based drug supply chain system that ensures transparency, authenticity, and traceability of pharmaceutical products from manufacturer to pharmacy.

---

## 🚀 Overview

This decentralized application (DApp) tracks the lifecycle of a drug batch across multiple stakeholders:

* 🏭 Manufacturer → registers drug batch
* 🧪 Lab → tests and verifies quality
* 🚚 Distributor → transfers ownership
* 🏥 Pharmacy → verifies authenticity

All transactions are recorded on the blockchain, ensuring **tamper-proof traceability**.

---

## 🧩 Features

* 🔐 Role-based access control (Manufacturer, Lab, Distributor, Pharmacy)
* 📦 Batch registration with metadata
* 🧪 Lab testing (Pass / Fail)
* 🔄 Ownership transfer across supply chain
* 🔍 Batch verification system
* 📊 Timeline visualization of product journey
* 📜 Blockchain-based transfer history
* 🧾 Activity logs (UI-level tracking)
* 🌐 MetaMask wallet integration

---

## 🛠️ Tech Stack

### Blockchain

* Solidity
* Hardhat
* Ethers.js

### Frontend

* React.js (Create React App)
* CSS (Custom UI / Glassmorphism design)

### Wallet

* MetaMask

---

## 📂 Project Structure

```
drug-traceability/
│
├── contracts/              # Smart contracts (Solidity)
├── scripts/                # Deployment & demo scripts
│   └── demo.cjs
├── test/                   # Contract tests
│
├── frontend/               # React frontend
│   ├── public/
│   └── src/
│       ├── App.js
│       ├── App.css
│
├── hardhat.config.cjs
└── .env
```

---

## ⚙️ Setup & Installation

### 1️⃣ Clone Repository

```
git clone https://github.com/ZayanLambe13/Drug-Traceability.git
cd Drug-Traceability
```

---

### 2️⃣ Install Dependencies

#### Backend (Hardhat)

```
npm install
```

#### Frontend

```
cd frontend
npm install
```

---

### 3️⃣ Start Local Blockchain

```
npx hardhat node
```

---

### 4️⃣ Deploy & Initialize System

```
npx hardhat run scripts/demo.cjs --network localhost
```

This will:

* Deploy contract
* Assign roles
* Simulate full supply chain flow

---

### 5️⃣ Run Frontend

```
cd frontend
npm start
```

Open:

```
http://localhost:3000
```

---

## 🧪 Test Accounts (Hardhat)

| Role         | Address   |
| ------------ | --------- |
| Manufacturer | 0x7099... |
| Lab          | 0x3C44... |
| Distributor  | 0x90F7... |
| Pharmacy     | 0x15d3... |

👉 Import these accounts into MetaMask using Hardhat private keys.

---

## 🔄 Workflow

1. Manufacturer registers a batch
2. Lab performs testing (Pass / Fail)
3. Distributor receives and transfers
4. Pharmacy verifies final product
5. User can view full history and timeline

---

## 📊 UI Highlights

* Clean dark dashboard UI
* Timeline-based tracking
* Verification details panel
* Transfer history (on-chain)
* Activity logs (off-chain UI)

---

## 🔐 Security Notes

* Do NOT expose `.env` file
* Do NOT push private keys
* Use test accounts only (Hardhat local network)

---

## 🚧 Future Improvements

* 📱 QR Code verification system
* ☁️ IPFS file upload for lab reports
* 🌍 Deployment on Sepolia testnet
* 📄 Export verification reports (PDF)
* 👥 Multi-user login system

---

## 👨‍💻 Author

**Zayan Lambe**

---
