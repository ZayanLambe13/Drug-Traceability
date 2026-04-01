require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "./.env" });

console.log("RPC:", process.env.SEPOLIA_RPC_URL);
console.log("PK:", process.env.PRIVATE_KEY);

module.exports = {
  solidity: "0.8.28",
  networks: {
  // sepolia: {
  //   url: process.env.SEPOLIA_RPC_URL,
  //   accounts: [process.env.PRIVATE_KEY],
  // },
}
};