// ======================= FULL APP =======================
// Preserves: search, recent, KPI, details, history, activity log, timeline
// Adds: lab params, fail logic, multi-branch pharmacy, tx.wait() safety
// NEW: Activity log shows "Transferred to <Branch> - <BatchId>"

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./App.css";

// ----------------------- CONFIG -----------------------
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const ABI = [
  "function registerBatch(string,string,uint256,uint256)",
  "function submitTestResult(string,bool,string)",
  "function transferOwnership(string,address)",
  "function getBatchDetails(string) view returns (string,string,uint256,uint256,address,bool,string,uint8)",
  "function getBatchHistory(string) view returns (tuple(address from,address to,uint256 timestamp)[])",
  "function roles(address) view returns (uint8)"
];

const roleNames = ["None","Manufacturer","Lab","Distributor","Pharmacy"];
const stages = ["Manufactured","Tested","Distributed","In Pharmacy"];

// Multiple pharmacy branches
const receivers = {
  Distributor: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  Pharmacy_Mumbai: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  Pharmacy_Delhi: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
  Pharmacy_Pune: "0x976EA74026E726554dB657fA54763abd0C3a0aa9"
};

// ----------------------- COMPONENT -----------------------
function App() {

  // -------- Core inputs --------
  const [batchId, setBatchId] = useState("");
  const [drugName, setDrugName] = useState("");
  const [receiver, setReceiver] = useState("");

  // -------- Lab parameters --------
  const [temperature, setTemperature] = useState("");
  const [ph, setPh] = useState("");
  const [purity, setPurity] = useState("");

  // -------- Search / recent --------
  const [search, setSearch] = useState("");
  const [recentBatches, setRecentBatches] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  // -------- Results / logs --------
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [globalHistory, setGlobalHistory] = useState([]);

  const [showHistory, setShowHistory] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [kpiFilter, setKpiFilter] = useState(null);

  // -------- Wallet --------
  const [role, setRole] = useState("None");
  const [account, setAccount] = useState("");
  const [signer, setSigner] = useState(null);

  const shortAddress = (addr) => addr ? addr.slice(0,6)+"..."+addr.slice(-4) : "";

  // 🔥 Helper: map address → branch name
  const getBranchName = (addr) => {
    if (!addr) return "Unknown";
    const map = {
      [receivers.Pharmacy_Mumbai]: "Mumbai",
      [receivers.Pharmacy_Delhi]: "Delhi",
      [receivers.Pharmacy_Pune]: "Pune",
      [receivers.Distributor]: "Distributor"
    };
    return map[addr] || shortAddress(addr);
  };

  const getFailureReasons = () => {
  const reasons = [];

  if (Number(purity) < 80) {
    reasons.push("Purity below acceptable level (<80%)");
  }

  if (Number(ph) < 6 || Number(ph) > 8) {
    reasons.push("pH out of acceptable range (6–8)");
  }

  if (temperature && Number(temperature) > 40) {
    reasons.push("Temperature too high");
  }

  return reasons;
};

  // ----------------------- LOCAL STORAGE -----------------------
  useEffect(() => {
    const saved = localStorage.getItem("globalHistory");
    if (saved) setGlobalHistory(JSON.parse(saved));

    const batches = localStorage.getItem("recentBatches");
    if (batches) setRecentBatches(JSON.parse(batches));
  }, []);

  const saveBatch = (id) => {
    const updated = [id, ...recentBatches.filter(b => b !== id)];
    setRecentBatches(updated);
    localStorage.setItem("recentBatches", JSON.stringify(updated));
  };

  const saveGlobalHistory = (entry) => {
    const updated = [entry, ...globalHistory];
    setGlobalHistory(updated);
    localStorage.setItem("globalHistory", JSON.stringify(updated));
  };

  // ----------------------- WALLET INIT -----------------------
  useEffect(() => {
    const init = async () => {
      try {
        if (!window.ethereum) {
          setStatus("MetaMask not found");
          return;
        }

        const provider = new ethers.BrowserProvider(window.ethereum);

        let accounts = await provider.send("eth_accounts", []);
        if (accounts.length === 0) {
          accounts = await provider.send("eth_requestAccounts", []);
        }

        const signer = await provider.getSigner();
        setSigner(signer);
        setAccount(accounts[0]);

        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
        const roleId = await contract.roles(accounts[0]);
        setRole(roleNames[Number(roleId)]);

        setStatus("Wallet Connected");
      } catch (err) {
        console.error(err);
        setStatus("Wallet init failed");
      }
    };

    init();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", () => window.location.reload());
    }
  }, []);

  const getContract = async () => {
    if (!signer) throw new Error("Wallet not connected");
    return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  };

  // ----------------------- KPI -----------------------
  const total = globalHistory.length;
  const passed = globalHistory.filter(h => h.type === "Test Passed").length;
  const failed = globalHistory.filter(h => h.type === "Test Failed").length;

  // ----------------------- ACTIONS -----------------------

  // REGISTER
  const register = async () => {
    try {
      if (!batchId || !drugName) {
        setStatus("Enter Batch ID and Drug Name");
        return;
      }

      const contract = await getContract();
      const tx = await contract.registerBatch(
        batchId,
        drugName,
        Math.floor(Date.now()/1000),
        Math.floor(Date.now()/1000) + 31536000
      );
      await tx.wait();

      saveBatch(batchId);
      saveGlobalHistory({ type: "Register", batchId, time: Date.now() });

      setStatus("Batch Registered");
    } catch (err) {
      console.error(err);
      setStatus(err.reason || err.message || "Registration failed");
    }
  };

  // TEST
const test = async () => {
  try {
    if (!batchId) {
      setStatus("Enter Batch ID");
      return;
    }

    if (!purity || !ph) {
      setStatus("Enter lab parameters");
      return;
    }

    let pass = true;

if (Number(purity) < 80 || Number(ph) < 6 || Number(ph) > 8) {
  pass = false;
}

    const contract = await getContract();

    // 🔥 GET EXISTING DATA
    const existing = await contract.getBatchDetails(batchId);

    // ❌ BLOCK if already passed
    if (existing[5] === true) {
      setStatus("❌ Already passed. Re-testing not allowed");
      return;
    }

    // ✔ ALLOW retest if failed
    if (Number(existing[7]) > 1 && existing[5] === false) {
      setStatus("🔁 Retesting failed batch...");
    }

    console.log("Stage before test:", existing[7].toString());

    // 🔥 RUN TEST
    const tx = await contract.submitTestResult(batchId, pass, "QmHash");
    await tx.wait();

    localStorage.setItem(
  `lab_${batchId}`,
  JSON.stringify({ ph, purity, temperature })
);

    saveGlobalHistory({
      type: pass ? "Test Passed" : "Test Failed",
      batchId,
      time: Date.now()
    });

    setStatus(pass ? "Test Passed" : "Test Failed");

  } catch (err) {
    console.error(err);
    setStatus(err.reason || err.message || "Test failed");
  }
};


  // TRANSFER (with branch info)
  const transfer = async () => {
    try {
      if (!batchId || !receiver) {
        setStatus("Select batch and receiver");
        return;
      }

      const contract = await getContract();
      const tx = await contract.transferOwnership(batchId, receiver);
      await tx.wait();
      const data = await contract.getBatchDetails(batchId);

// ❌ Block if not tested yet
if (Number(data[7]) === 0) {
  setStatus("❌ Cannot transfer: Batch not tested yet");
  return;
}

      saveGlobalHistory({
        type: "Transfer",
        batchId,
        to: receiver,
        branch: getBranchName(receiver), // 🔥 important
        time: Date.now()
      });

      setStatus(`Transferred to ${getBranchName(receiver)}`);
    } catch (err) {
      console.error(err);
      setStatus(err.reason || err.message || "Transfer failed");
    }
  };

 const verify = async (id) => {
  try {
    if (!id) {
      setStatus("Enter Batch ID");
      return;
    }

    const contract = await getContract();

    const data = await contract.getBatchDetails(id);
    const hist = await contract.getBatchHistory(id);

    const savedLab = localStorage.getItem(`lab_${id}`);

if (savedLab) {
  const parsed = JSON.parse(savedLab);
  setPh(parsed.ph);
  setPurity(parsed.purity);
  setTemperature(parsed.temperature);
}

    console.log("STAGE:", Number(data[7]));
    console.log("OWNER:", data[4]);

    // 🔥 DEBUG (very important)
    console.log("VERIFY DATA:", {
      batchId: data[0],
      drug: data[1],
      owner: data[4],
      testPassed: data[5],
      stage: Number(data[7])
    });

    // 🔥 FORCE fresh render (important fix)
    setResult([...data]);
    setHistory([...hist]);

    saveBatch(id);

    setStatus("Verified (Latest Data)");
  } catch (err) {
    console.error(err);
    setStatus(err.reason || err.message || "Verification failed");

  }
};

const verifyAtPharmacy = async (id) => {
  try {
    if (!id) {
      setStatus("Enter Batch ID");
      return;
    }

    if (role !== "Pharmacy") {
      setStatus("Only pharmacy can verify final delivery");
      return;
    }

    const contract = await getContract();
    const data = await contract.getBatchDetails(id);

    if (!data[5]) {
      setStatus("❌ Cannot dispense: Batch failed lab test");
      return;
    }

    if (Number(data[7]) !== 3) {
      setStatus("❌ Batch not yet delivered to pharmacy");
      return;
    }

    setStatus("✅ Verified at Pharmacy - Ready for dispensing");

  } catch (err) {
    console.error(err);
    setStatus("Pharmacy verification failed");
  }
};

const markDispensed = async (id) => {
  try {
    if (!id) {
      setStatus("Enter Batch ID");
      return;
    }

    if (!result[5]) {
      setStatus("❌ Cannot dispense failed batch");
      return;
    }

    saveGlobalHistory({
      type: "Dispensed",
      batchId: id,
      time: Date.now()
    });

    setStatus("✅ Drug dispensed to patient");

  } catch (err) {
    console.error(err);
    setStatus("Dispense failed");
  }
};

  // ----------------------- UI HELPERS -----------------------
 const Timeline = () => {
  if (!result) return null;

  return (
    <div className="card">

      {/* 🔽 DROPDOWN HEADER */}
      <div
        onClick={() => setShowTimeline(prev => !prev)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          cursor: "pointer",
          alignItems: "center"
        }}
      >
        <h2>Verification Timeline</h2>
        <span>{showTimeline ? "▲" : "▼"}</span>
      </div>

      {/* 🔽 ORIGINAL TIMELINE (UNCHANGED UI) */}
      {showTimeline && (
        <div className="timeline">
          {stages.map((s, i) => {

            // 🔥 FIX: ensure number comparison
const stageValue = Number(result[7]);

const isDispensed = globalHistory.some(
  h => h.batchId === result[0] && h.type === "Dispensed"
);

const hasReachedPharmacy = history.length > 0 && stageValue >= 3;

const active =
  isDispensed
    ? true
    : i === 3
    ? hasReachedPharmacy
    : i <= stageValue;

const failedStep =
  i === 1 &&
  result[5] === false &&
  stageValue <= 1;

            return (
              <div key={i} className="step">
                <div
                  className={`circle ${active ? "active" : ""} ${failedStep ? "fail" : ""}`}
                >
                  {failedStep ? "✖" : active ? "✔" : ""}
                </div>
                <p>
  {s}
  {i === 3 && result && ` (${getBranchName(result[4])})`}
</p>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

  // ----------------------- RENDER -----------------------
  return (
    <div className="container">

      <h1>💊 Drug Traceability And Testability System</h1>

      <div className="wallet">
        <p>{shortAddress(account)}</p>
        <p>{role}</p>
      </div>

  <div className="kpi">

  {/* TOTAL */}
  <div
    onClick={() => setKpiFilter(prev => prev === "ALL" ? null : "ALL")}
    style={{ cursor: "pointer" }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span>📦 Total: {total}</span>
      <span>{kpiFilter === "ALL" ? "▲" : "▼"}</span>
    </div>
    <small>All registered batches</small>
  </div>

  {/* PASSED */}
  <div
    onClick={() => setKpiFilter(prev => prev === "PASSED" ? null : "PASSED")}
    style={{ cursor: "pointer" }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span>✅ Passed: {passed}</span>
      <span>{kpiFilter === "PASSED" ? "▲" : "▼"}</span>
    </div>
    <small>Quality approved</small>
  </div>

  {/* FAILED */}
  <div
    onClick={() => setKpiFilter(prev => prev === "FAILED" ? null : "FAILED")}
    style={{ cursor: "pointer" }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span>❌ Failed: {failed}</span>
      <span>{kpiFilter === "FAILED" ? "▲" : "▼"}</span>
    </div>
    <small>Rejected after testing</small>
  </div>
  <div
  title="Percentage of batches that passed testing"
  style={{ cursor: "default" }}
>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <span>📊 Success Rate</span>
    <span>
  {passed + failed > 0
    ? Math.round((passed / (passed + failed)) * 100)
    : 0}%
</span>
  </div>
  <small>Overall Drug performance</small>
</div>

</div>


{kpiFilter && (
  <div className="card">
    <h2>
      {kpiFilter === "ALL" && "All Batches"}
      {kpiFilter === "PASSED" && "Passed Batches"}
      {kpiFilter === "FAILED" && "Failed Batches"}
    </h2>

    {globalHistory
      .filter(h =>
  kpiFilter === "ALL"
    ? true
    : kpiFilter === "PASSED"
    ? h.type === "Test Passed"
    : kpiFilter === "FAILED"
    ? h.type === "Test Failed"
    : false
)
      .map((h, i) => (
        <div
          key={i}
          className="history-item"
          style={{ cursor: "pointer" }}
          onClick={() => verify(h.batchId)}
        >
          {h.batchId}
          <small>{new Date(h.time).toLocaleString()}</small>
        </div>
      ))}
  </div>
)}
<button onClick={() => setKpiFilter(null)}>Clear</button>

      {/* SEARCH DROPDOWN */}
<div className="card">

  <div
    onClick={() => setShowSearch(prev => !prev)}
    style={{
      display: "flex",
      justifyContent: "space-between",
      cursor: "pointer",
      alignItems: "center"
    }}
  >
    <h3>Search Batch</h3>
    <span>{showSearch ? "▲" : "▼"}</span>
  </div>

  {showSearch && (
    <>
      <input
        placeholder="Search Batch..."
        value={search}
        onChange={(e)=>setSearch(e.target.value)}
      />

      <div className="recent">
        {[...recentBatches]
  .filter(b => b.toLowerCase().includes(search.toLowerCase()))
  .sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, "")) || 0;
    const numB = parseInt(b.replace(/\D/g, "")) || 0;
    return numA - numB;
  })
  .map((b, i) => (
    <span key={i} onClick={() => verify(b)}>
      {b}
    </span>
  ))}
      </div>
    </>
  )}

</div>

      <div className="card">

        <input
          placeholder="Batch ID"
          value={batchId}
          onChange={(e)=>setBatchId(e.target.value)}
        />

        <input
          placeholder="Drug Name"
          value={drugName}
          onChange={(e)=>setDrugName(e.target.value)}
        />

        {role === "Lab" && (
          <>
            <input placeholder="Temperature (°C)" value={temperature} onChange={(e)=>setTemperature(e.target.value)} />
            <input placeholder="pH Level" value={ph} onChange={(e)=>setPh(e.target.value)} />
            <input placeholder="Purity (%)" value={purity} onChange={(e)=>setPurity(e.target.value)} />
          </>
        )}

        <select value={receiver} onChange={(e)=>setReceiver(e.target.value)}>
          <option value="">Select Receiver</option>

          {role==="Manufacturer" && (
            <option value={receivers.Distributor}>Distributor</option>
          )}

          {role==="Distributor" && (
            <>
              <option value={receivers.Pharmacy_Mumbai}>Pharmacy Mumbai</option>
              <option value={receivers.Pharmacy_Delhi}>Pharmacy Delhi</option>
              <option value={receivers.Pharmacy_Pune}>Pharmacy Pune</option>
            </>
          )}
        </select>

        <button disabled={role!=="Manufacturer"} onClick={register}>Register</button>
        <button disabled={role!=="Lab"} onClick={test}>Run Lab Test</button>
        <button disabled={(role!=="Manufacturer" && role!=="Distributor")} onClick={transfer}>Transfer</button>
        <button onClick={()=>verify(batchId)}>Verify</button>
        {role === "Pharmacy" && (
  <button onClick={() => verifyAtPharmacy(batchId)}>
    Final Verify
  </button>
)}

{role === "Pharmacy" && result && Number(result[7]) === 3 && (
  <button onClick={() => markDispensed(batchId)}>
    Mark as Dispensed
  </button>
)}

      </div>

      <p>{status}</p>

      <Timeline />

    {/* DETAILS */}
{result && (
  <div className="details-container">
    <h2>Details</h2>
    <div className="details-grid">

      <div>
        <span>Batch ID</span>
        <p>{result[0]}</p>
      </div>

      <div>
        <span>Drug Name</span>
        <p>{result[1]}</p>
      </div>

      <div>
        <span>Owner</span>
        <p>{shortAddress(result[4])}</p>
      </div>

      <div>
        <span>Stage</span>
        <p>
  {globalHistory.filter(h => h.batchId === result[0])[0]?.type === "Dispensed"
    ? "Dispensed"
    : stages[result[7]]}
</p>
      </div>

      <div>
        <span>Test Status</span>
        <p className={`badge ${result[5] ? "success" : "fail"}`}>
          {result[5] ? "Passed" : "Failed"}
        </p>
      </div>

      <div>
  <span>Lab Parameters</span>
  <p>
    pH: {ph || "N/A"} | Purity: {purity || "N/A"}% | Temp: {temperature || "N/A"}°C
  </p>
</div>



      {!result[5] && (
  <div>
    <span>Failure Reason</span>
    <p>
      {getFailureReasons().length > 0
        ? getFailureReasons().join(", ")
        : "Criteria not met"}
    </p>
  </div>
)}

      <div>
        <span>Current Location</span>
        <p>{getBranchName(result[4])}</p>
      </div>

      <div>
        <span>Manufacture Date</span>
        <p>{new Date(Number(result[2]) * 1000).toLocaleDateString()}</p>
      </div>

      <div>
        <span>Expiry Date</span>
        <p>{new Date(Number(result[3]) * 1000).toLocaleDateString()}</p>
      </div>

      <div>
        <span>IPFS Hash</span>
        <p>{result[6]}</p>
      </div>
      {globalHistory.some(h => h.batchId === result[0] && h.type === "Dispensed") && (
  <div>
    <span>Final Status</span>
    <p className="badge success">Dispensed</p>
  </div>
)}

    </div>
  </div>
)}
      
{/* HISTORY (Dropdown + Sequential) */}
{history.length > 0 && (
  <div className="card">

    {/* HEADER */}
    <div
      onClick={() => setShowHistory(!showHistory)}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        cursor: "pointer",
        userSelect: "none"
      }}
    >
      <h2>Batch History</h2>
      <span style={{ fontSize: "18px" }}>
        {showHistory ? "▲" : "▼"}
      </span>
    </div>

    {/* DROPDOWN */}
    {showHistory && (
      <div style={{ marginTop: "10px" }}>

        {[...history]
          .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
          .map((h, i) => (
            <div key={i} className="history-item">

              <strong>Step {i + 1}</strong>

              <div>
                {getBranchName(h.from)} → {getBranchName(h.to)}
              </div>

              <small>
                {new Date(Number(h.timestamp) * 1000).toLocaleString()}
              </small>

            </div>
          ))
        }

      </div>
    )}

  </div>
)}
      {/* GLOBAL LOG */}
      <div className="card">
        <h2>Activity Log</h2>
        {globalHistory.map((h, i) => (
          <div key={i} className="history-item">
            {h.type === "Transfer"
              ? `Transferred to ${h.branch} - ${h.batchId}`
              : `${h.type} - ${h.batchId}`
            }
            <small>{new Date(h.time).toLocaleString()}</small>
          </div>
        ))}
      </div>

    </div>
  );
}

export default App;