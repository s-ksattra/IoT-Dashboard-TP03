import { useEffect, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export default function Home() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [limit, setLimit] = useState(50);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("Initializing…");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Load device list on first render
  useEffect(() => {
    fetchDevices();
  }, []);

  // Optionally auto-refresh current device every 10s
  useEffect(() => {
    const id = setInterval(() => {
      if (selectedDevice && !loading) {
        fetchDeviceData(selectedDevice, limit, false);
      }
    }, 10000);

    return () => clearInterval(id);
  }, [selectedDevice, limit, loading]);

  async function fetchDevices() {
    setStatus("Loading devices…");
    setError("");

    try {
      const res = await fetch(`${API_BASE}/devices`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const deviceNames =
        data?.map((d) => d.device_name || d.device || d.deviceName) || [];

      setDevices(deviceNames);

      if (deviceNames.length === 0) {
        setSelectedDevice("");
        setStatus("No devices found in database.");
        return;
      }

      // Choose the first device by default
      const first = deviceNames[0];
      setSelectedDevice(first);
      setStatus(`Devices loaded. Selected: ${first}`);
      // Load data for first device
      fetchDeviceData(first, limit, true);
    } catch (err) {
      console.error(err);
      setError("Failed to load devices. Check API server or CORS.");
      setStatus("Error loading devices.");
    }
  }

  async function fetchDeviceData(deviceName, limitValue, showLoading = true) {
    if (!deviceName) {
      setStatus("Please select a device.");
      return;
    }

    if (showLoading) setLoading(true);
    setError("");
    setStatus(`Loading data for ${deviceName}…`);

    try {
      const url = `${API_BASE}/devices/${encodeURIComponent(
        deviceName
      )}/data?limit=${limitValue}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      setRows(json.data || []);
      setStatus(`Loaded ${json.count || 0} rows for ${deviceName}.`);
    } catch (err) {
      console.error(err);
      setError("Failed to load data. Check API / database.");
      setStatus("Error loading data.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  function handleDeviceChange(e) {
    const deviceName = e.target.value;
    setSelectedDevice(deviceName);
    if (deviceName) {
      fetchDeviceData(deviceName, limit, true);
    } else {
      setRows([]);
    }
  }

  function handleRefreshClick() {
    if (!selectedDevice) return;
    fetchDeviceData(selectedDevice, limit, true);
  }

  return (
    <>
      <header>
        <h1>IoT Sensor Dashboard (Next.js)</h1>
      </header>

      <main>
        <div className="card">
          <div className="controls">
            <label htmlFor="deviceSelect">
              <strong>Device:</strong>
            </label>
            <select
              id="deviceSelect"
              value={selectedDevice}
              onChange={handleDeviceChange}
            >
              {devices.length === 0 && (
                <option value="">No devices found</option>
              )}
              {devices.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <label htmlFor="limitInput">
              <strong>Limit:</strong>
            </label>
            <input
              id="limitInput"
              type="number"
              min={1}
              max={500}
              value={limit}
              onChange={(e) =>
                setLimit(Math.max(1, Math.min(500, Number(e.target.value) || 1)))
              }
            />

            <button onClick={handleRefreshClick} disabled={loading || !selectedDevice}>
              {loading ? "Loading…" : "Refresh Data"}
            </button>

            <span className="status">{status}</span>
          </div>
          {error && <div className="error">{error}</div>}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            Device Data {selectedDevice ? `– ${selectedDevice}` : ""}
          </h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Topic</th>
                <th>Payload (JSON)</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4}>No data loaded for this device.</td>
                </tr>
              )}
              {rows.map((row, index) => {
                // payload_json handling (you already have this)
                let payloadJson = row.payload_json;
                try {
                  if (typeof payloadJson === "string") {
                    payloadJson = JSON.parse(payloadJson);
                  }
                } catch (e) {}


                // 👇 include timestamp here
                const createdAt = row.timestamp || row.created_at || row.createdAt;

                return (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>
                      <span className="badge">{row.topic}</span>
                    </td>
                    <td>
                      <pre>
                        {payloadJson ? JSON.stringify(payloadJson, null, 2) : "-"}
                      </pre>
                    </td>
                    <td>
                      {createdAt ? new Date(createdAt).toLocaleString() : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
