// SAME CODE — ONLY SAFE WALLET FIX APPLIED

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./App.css";

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

const receivers = {
  Distributor: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  Pharmacy: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"
};

function App() {

  const [batchId, setBatchId] = useState("");
  const [drugName, setDrugName] = useState("");
  const [receiver, setReceiver] = useState("");

  const [search, setSearch] = useState("");
  const [recentBatches, setRecentBatches] = useState([]);

  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [globalHistory, setGlobalHistory] = useState([]);

  const [role, setRole] = useState("None");
  const [account, setAccount] = useState("");

  const [signer, setSigner] = useState(null);

  const shortAddress = (addr) => addr ? addr.slice(0,6)+"..."+addr.slice(-4) : "";

  // LOAD LOCAL DATA
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

  // WALLET INIT
  useEffect(() => {
    let initialized = false;

    const init = async () => {
      if (initialized) return;
      initialized = true;

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

        const address = accounts[0];
        setAccount(address);

        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
        const roleId = await contract.roles(address);

        setRole(roleNames[Number(roleId)]);
        setStatus("Wallet Connected");

      } catch (err) {
        console.error("INIT ERROR:", err);

        if (err.code === -32002) {
          setStatus("⚠️ MetaMask request already open");
        } else {
          setStatus(err?.reason || err?.message || "Init failed");
        }
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

  const total = globalHistory.length;
  const passed = globalHistory.filter(h => h.type === "Test Passed").length;
  const failed = globalHistory.filter(h => h.type === "Test Failed").length;

  const register = async () => {
    try {
      const contract = await getContract();
      await contract.registerBatch(
        batchId,
        drugName,
        Math.floor(Date.now()/1000),
        Math.floor(Date.now()/1000)+31536000
      );

      saveBatch(batchId);
      saveGlobalHistory({ type: "Register", batchId, time: Date.now() });

      setStatus("Batch Registered");
    } catch (err) {
      console.error(err);
      setStatus(err?.reason || err?.message || "Registration failed");
    }
  };

  const test = async (pass) => {
    try {
      const contract = await getContract();
      await contract.submitTestResult(batchId, pass, "QmHash");

      saveGlobalHistory({
        type: pass ? "Test Passed" : "Test Failed",
        batchId,
        time: Date.now()
      });

      setStatus(pass ? "Test Passed" : "Test Failed");
    } catch (err) {
      console.error(err);
      setStatus(err?.reason || err?.message || "Test failed");
    }
  };

  const transfer = async () => {
    try {
      const contract = await getContract();
      await contract.transferOwnership(batchId, receiver);

      saveGlobalHistory({
        type: "Transfer",
        batchId,
        to: receiver,
        time: Date.now()
      });

      setStatus("Transferred");
    } catch (err) {
      console.error(err);
      setStatus(err?.reason || err?.message || "Transfer blocked");
    }
  };

  const verify = async (id) => {
    if (!id) return;

    try {
      const contract = await getContract();
      const data = await contract.getBatchDetails(id);
      const hist = await contract.getBatchHistory(id);

      setResult(data);
      setHistory(hist);
      saveBatch(id);

      setStatus("Verified");
    } catch (err) {
      console.error(err);
      setStatus(err?.reason || err?.message || "Verification failed");
    }
  };

  const Timeline = () => {
    if (!result) return null;

    return (
      <div className="timeline">
        {stages.map((s, i) => {
          const active = i <= result[7];
          const failed = i === 1 && result[5] === false;

          return (
            <div key={i} className="step">
              <div className={`circle ${active ? "active" : ""} ${failed ? "fail" : ""}`}>
                {failed ? "✖" : active ? "✔" : ""}
              </div>
              <p>{s}</p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container">

      <h1>💊 Dashboard</h1>

      <div className="wallet">
        <p>{shortAddress(account)}</p>
        <p>{role}</p>
      </div>

      <div className="kpi">
        <div>📦 Total: {total}</div>
        <div>✅ Passed: {passed}</div>
        <div>❌ Failed: {failed}</div>
      </div>

      <input placeholder="Search Batch..." onChange={(e)=>setSearch(e.target.value)} />

      <div className="recent">
        {recentBatches
          .filter(b => b.toLowerCase().includes(search.toLowerCase()))
          .map((b,i)=>(
            <span key={i} onClick={()=>verify(b)}>{b}</span>
          ))}
      </div>

      <div className="card">
        <input placeholder="Batch ID" onChange={(e)=>setBatchId(e.target.value)} />
        <input placeholder="Drug Name" onChange={(e)=>setDrugName(e.target.value)} />

        <select onChange={(e)=>setReceiver(e.target.value)}>
          <option>Select Receiver</option>
          {role==="Manufacturer" && <option value={receivers.Distributor}>Distributor</option>}
          {role==="Distributor" && <option value={receivers.Pharmacy}>Pharmacy</option>}
        </select>

        <button disabled={role!=="Manufacturer"} onClick={register}>Register</button>
        <button disabled={role!=="Lab"} onClick={()=>test(true)}>Pass</button>
        <button disabled={role!=="Lab"} onClick={()=>test(false)}>Fail</button>
        <button disabled={(role!=="Manufacturer" && role!=="Distributor")} onClick={transfer}>Transfer</button>
        <button onClick={() => verify(batchId)}>Verify</button>
      </div>

      <p>{status}</p>

      <Timeline />

      {/* ================= DETAILS ================= */}
      {result && (
        <div className="details-container">

          <h2>Details</h2>

          <div className="details-grid">

            <div><span>Batch</span><p>{result[0]}</p></div>
            <div><span>Drug</span><p>{result[1]}</p></div>
            <div><span>Owner</span><p>{shortAddress(result[4])}</p></div>
            <div><span>Status</span><p>{stages[result[7]]}</p></div>

            <div>
              <span>Test Status</span>
              <p>
                <span className={`badge ${result[5] ? "success" : "fail"}`}>
                  {result[5] ? "Passed" : "Failed"}
                </span>
              </p>
            </div>

            <div>
              <span>Verification</span>
              <p><span className="badge success">Approved</span></p>
            </div>

            <div><span>Manufacture Date</span><p>{new Date(Number(result[2])*1000).toLocaleDateString()}</p></div>
            <div><span>Expiry Date</span><p>{new Date(Number(result[3])*1000).toLocaleDateString()}</p></div>

            <div>
              <span>Lab Report</span>
              <p>
                <a href={`https://ipfs.io/ipfs/${result[6]}`} target="_blank" rel="noreferrer">
                  View Report
                </a>
              </p>
            </div>

          </div>
        </div>
      )}

      {/* ================= HISTORY ================= */}
      {history.length > 0 && (
        <div className="card">
          <h2>Batch History</h2>
          {history.map((h, i) => (
            <div key={i} className="history-item">
              {shortAddress(h.from)} → {shortAddress(h.to)}
              <small>{new Date(Number(h.timestamp)*1000).toLocaleString()}</small>
            </div>
          ))}
        </div>
      )}

      {/* ================= ACTIVITY ================= */}
      <div className="card">
        <h2>Activity Log</h2>
        {globalHistory.map((h, i) => (
          <div key={i} className="history-item">
            {h.type} - {h.batchId}
            <small>{new Date(h.time).toLocaleString()}</small>
          </div>
        ))}
      </div>

    </div>
  );
}

export default App;