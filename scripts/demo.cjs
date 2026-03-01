const hre = require("hardhat");

async function main() {

  console.log("🚀 Starting Drug Traceability Demo...\n");

  // Deploy Contract
  const DrugFactory = await hre.ethers.getContractFactory("DrugTraceability");
  const Drug = await DrugFactory.deploy();
  await Drug.waitForDeployment();

  console.log("✅ Contract Deployed At:", Drug.target, "\n");

  // Get Accounts
  const [admin, manufacturer, lab, distributor, pharmacy] =
    await hre.ethers.getSigners();

  console.log("👤 Accounts Loaded:");
  console.log("Admin:", admin.address);
  console.log("Manufacturer:", manufacturer.address);
  console.log("Lab:", lab.address);
  console.log("Distributor:", distributor.address);
  console.log("Pharmacy:", pharmacy.address, "\n");

  // Assign Roles
  console.log("🔐 Assigning Roles...");
  await Drug.assignRole(manufacturer.address, 1);
  await Drug.assignRole(lab.address, 2);
  await Drug.assignRole(distributor.address, 3);
  await Drug.assignRole(pharmacy.address, 4);
  console.log("✅ Roles Assigned\n");

  // Register Batch
  console.log("🏭 Registering Batch...");
  await Drug.connect(manufacturer).registerBatch(
    "BATCH101",
    "Paracetamol",
    Math.floor(Date.now() / 1000),
    Math.floor(Date.now() / 1000) + 31536000
  );
  console.log("✅ Batch Registered\n");

  // Lab Test
  console.log("🧪 Submitting Lab Test...");
  await Drug.connect(lab).submitTestResult(
    "BATCH101",
    true,
    "QmIPFSHashExample"
  );
  console.log("✅ Lab Test Submitted\n");

  // Transfer to Distributor
  console.log("🚚 Transferring To Distributor...");
  await Drug.connect(manufacturer).transferOwnership(
    "BATCH101",
    distributor.address
  );
  console.log("✅ Transferred To Distributor\n");

  // Transfer to Pharmacy
  console.log("🏥 Transferring To Pharmacy...");
  await Drug.connect(distributor).transferOwnership(
    "BATCH101",
    pharmacy.address
  );
  console.log("✅ Transferred To Pharmacy\n");

  // Final Verification
  console.log("🔍 Fetching Final Batch Details...");
  const batch = await Drug.getBatchDetails("BATCH101");
  console.log("📦 Final Batch Details:");
  console.log(batch, "\n");

  // Transfer History
  console.log("📜 Transfer History:");
  const history = await Drug.getBatchHistory("BATCH101");
  console.log(history);

  console.log("\n🎉 Demo Completed Successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});