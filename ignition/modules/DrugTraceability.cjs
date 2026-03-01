const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("DrugTraceabilityModule", (m) => {
  const drugTraceability = m.contract("DrugTraceability");

  return { drugTraceability };
});
