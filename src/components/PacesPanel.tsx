import React, { useState, useEffect } from "react";
import "./PacesPanel.css";

interface PaceData {
  pace_range: string;
  vo2_percent: string;
}

interface PacesHistory {
  date: string;
  paces: PaceData;
}

interface PacesPanelProps {
  className?: string;
  selectedUser: "aaron" | "kristin";
  onUserChange: (user: "aaron" | "kristin") => void;
}

const PacesPanel: React.FC<PacesPanelProps> = ({ className = "", selectedUser, onUserChange }) => {
  const [pacesData, setPacesData] = useState<PaceData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPacesData(selectedUser);
  }, [selectedUser]);

  const loadPacesData = async (user: "aaron" | "kristin") => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/${user}_paces.json`);
      if (!response.ok) {
        throw new Error(`Failed to load paces for ${user}`);
      }

      const history: PacesHistory[] = await response.json();
      if (history.length > 0) {
        // Get the most recent paces data
        const latestData = history[history.length - 1];
        setPacesData(latestData.paces);
        setLastUpdated(latestData.date);
      } else {
        setPacesData(null);
        setLastUpdated(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load paces");
      setPacesData(null);
      setLastUpdated(null);
    } finally {
      setLoading(false);
    }
  };

  const formatPace = (paceStr: string): string => {
    // Pace ranges are already formatted (e.g., "8:53/mi - …", "8:17/mi - 9:44/mi")
    return paceStr;
  };

  const formatVO2Percent = (vo2Str: string): string => {
    // VO2 percentages are already formatted (e.g., "Up to 70% vVO2max", "64% - 75% vVO2max")
    return vo2Str;
  };

  const getPaceColor = (paceType: string): string => {
    // Color code different pace types
    const colors: { [key: string]: string } = {
      "Recovery": "#95a5a6",
      "Aerobic": "#3498db",
      "Long/Medium long": "#27ae60",
      "Marathon": "#e74c3c",
      "Lactate threshold": "#f39c12",
      "VO2max": "#9b59b6",
      "Tempo": "#e67e22",
      "Threshold": "#f39c12",
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
      margin: "1em 0",
      position: "sticky",
      top: "0",
      zIndex: 100
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Training Paces</h3>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => onUserChange("aaron")}
              style={{
                padding: "0.4rem 0.8rem",
                fontSize: "0.9rem",
                fontWeight: selectedUser === "aaron" ? "bold" : "normal",
                backgroundColor: selectedUser === "aaron" ? "var(--secondary-color)" : "transparent",
                color: "var(--text-color)",
                border: "2px solid var(--secondary-color)",
                borderRadius: "0.25rem",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Aaron
            </button>
            <button
              onClick={() => onUserChange("kristin")}
              style={{
                padding: "0.4rem 0.8rem",
                fontSize: "0.9rem",
                fontWeight: selectedUser === "kristin" ? "bold" : "normal",
                backgroundColor: selectedUser === "kristin" ? "var(--secondary-color)" : "transparent",
                color: "var(--text-color)",
                border: "2px solid var(--secondary-color)",
                borderRadius: "0.25rem",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Kristin
            </button>
          </div>
        </div>
        {lastUpdated && (
          <div style={{ 
            fontSize: "0.8rem", 
            color: "var(--text-color)", 
            opacity: 0.7,
            marginLeft: "auto"
          }}>
            updated: {(() => {
              const date = new Date(lastUpdated);
              const now = new Date();
              const diffMs = now.getTime() - date.getTime();
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              
              if (diffHours < 1) {
                return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
              } else if (diffHours < 24) {
                return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
              } else {
                const diffDays = Math.floor(diffHours / 24);
                return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
              }
            })()}
          </div>
        )}
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
        <>
          {/* Desktop: Horizontal row */}
          <div className="paces-table-horizontal" style={{
            background: "var(--secondary-color)",
            borderRadius: "0.5rem",
            fontFamily: "'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
            fontSize: "1em",
            margin: 0
          }}>
            {[
              { label: "Recovery", synonyms: ["recovery"] },
              { label: "Gen-aerobic", synonyms: ["gen-aerobic", "general aerobic", "aerobic"] },
              { label: "Long/Medium", synonyms: ["long/medium", "long/medium long", "long run", "medium long"] },
              { label: "Marathon", synonyms: ["marathon"] },
              { label: "LT", synonyms: ["lt", "lactate threshold", "threshold"] },
              { label: "VO2max", synonyms: ["vo2max", "vo2 max"] },
            ].map((row, i) => {
              let foundKey = Object.keys(pacesData).find(k =>
                row.synonyms.some(syn => k.toLowerCase().includes(syn))
              );
              let value = foundKey ? pacesData[foundKey].pace_range : "-";
              return (
                <div key={i} className="pace-zone">
                  <span className="pace-zone-label">{row.label}</span>
                  <span className="pace-zone-value">{value || "-"}</span>
                </div>
              );
            })}
          </div>

          {/* Mobile: Vertical table */}
          <div className="paces-table-vertical" style={{
            background: "var(--secondary-color)",
            borderRadius: "0.5rem",
            padding: "1em",
            fontFamily: "'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
            fontSize: "1em",
            overflowX: "auto",
            margin: 0
          }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <tbody>
                {[
                  { label: "Recovery", synonyms: ["recovery"] },
                  { label: "Gen-aerobic", synonyms: ["gen-aerobic", "general aerobic", "aerobic"] },
                  { label: "Long/Medium", synonyms: ["long/medium", "long/medium long", "long run", "medium long"] },
                  { label: "Marathon", synonyms: ["marathon"] },
                  { label: "LT", synonyms: ["lt", "lactate threshold", "threshold"] },
                  { label: "VO2max", synonyms: ["vo2max", "vo2 max"] },
                ].map((row, i) => {
                  let foundKey = Object.keys(pacesData).find(k =>
                    row.synonyms.some(syn => k.toLowerCase().includes(syn))
                  );
                  let value = foundKey ? pacesData[foundKey].pace_range : "-";
                  return (
                    <tr key={i}>
                      <td className="pace-label" style={{
                        paddingRight: '1em',
                        fontWeight: 500,
                        textAlign: 'right',
                        borderRight: '2px solid #b3b3b3',
                        minWidth: '7em',
                        verticalAlign: 'middle',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '10em',
                      }}>{row.label}</td>
                      <td className="pace-value" style={{
                        paddingLeft: '1em',
                        paddingRight: '0.5em',
                        textAlign: 'left',
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 600,
                        minWidth: '12em',
                        verticalAlign: 'middle',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '16em',
                      }}>{value || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
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