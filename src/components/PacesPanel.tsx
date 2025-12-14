import React, { useState, useEffect } from "react";

interface PaceData {
  [key: string]: string;
}

interface PacesHistory {
  date: string;
  paces: PaceData;
}

interface PacesPanelProps {
  className?: string;
}

const PacesPanel: React.FC<PacesPanelProps> = ({ className = "" }) => {
  const [selectedUser, setSelectedUser] = useState<"aaron" | "kristin">("aaron");
  const [pacesData, setPacesData] = useState<PaceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPacesData(selectedUser);
  }, [selectedUser]);

  const loadPacesData = async (user: "aaron" | "kristin") => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/data/${user}_paces.json`);
      if (!response.ok) {
        throw new Error(`Failed to load paces for ${user}`);
      }

      const history: PacesHistory[] = await response.json();
      if (history.length > 0) {
        // Get the most recent paces data
        const latestData = history[history.length - 1];
        setPacesData(latestData.paces);
      } else {
        setPacesData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load paces");
      setPacesData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatPace = (paceStr: string): string => {
    // Convert pace format if needed (e.g., "4:30" to "4:30/mi")
    if (paceStr.includes(":")) {
      return `${paceStr}/mi`;
    }
    return paceStr;
  };

  const getPaceColor = (paceType: string): string => {
    // Color code different pace types
    const colors: { [key: string]: string } = {
      "Marathon": "#e74c3c",
      "Half Marathon": "#f39c12",
      "10K": "#27ae60",
      "5K": "#3498db",
      "Tempo": "#9b59b6",
      "Threshold": "#e67e22",
      "Easy": "#95a5a6"
    };

    // Try to match pace type with color
    for (const [key, color] of Object.entries(colors)) {
      if (paceType.toLowerCase().includes(key.toLowerCase())) {
        return color;
      }
    }
    return "#34495e"; // Default color
  };

  return (
    <div className={`paces-panel ${className}`} style={{
      backgroundColor: "var(--card-color)",
      border: "3px solid var(--secondary-color)",
      borderRadius: "0.5rem",
      padding: "1em",
      margin: "1em 0"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0 }}>Training Paces</h3>
        <select
          className="select"
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value as "aaron" | "kristin")}
          style={{ fontSize: "14px", padding: "0.3em 0.6em" }}
        >
          <option value="aaron">Aaron</option>
          <option value="kristin">Kristin</option>
        </select>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p>Loading paces...</p>
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: "#fee",
          border: "1px solid #fcc",
          borderRadius: "0.25rem",
          padding: "1rem",
          marginBottom: "1rem"
        }}>
          <p style={{ color: "#c33", margin: 0 }}>
            ⚠️ {error}
          </p>
        </div>
      )}

      {pacesData && !loading && (
        <div className="paces-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem"
        }}>
          {Object.entries(pacesData).map(([paceType, paceValue]) => (
            <div
              key={paceType}
              className="pace-item"
              style={{
                backgroundColor: "var(--secondary-color)",
                borderRadius: "0.25rem",
                padding: "0.75rem",
                textAlign: "center"
              }}
            >
              <div
                style={{
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                  color: getPaceColor(paceType),
                  marginBottom: "0.25rem"
                }}
              >
                {paceType}
              </div>
              <div
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "900",
                  color: "var(--text-color)"
                }}
              >
                {formatPace(paceValue)}
              </div>
            </div>
          ))}
        </div>
      )}

      {!pacesData && !loading && !error && (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--disabled-fg-color)" }}>
          <p>No pace data available for {selectedUser}</p>
        </div>
      )}
    </div>
  );
};

export default PacesPanel;