// frontend/src/components/CameraView.jsx
import React, { useState, useEffect, useMemo } from "react";
import useWebSocket from "../hooks/useWebSocket";
import Analytics from "./Analytics";
import {
  MdSignalWifiOff,
  MdWifi,
  MdRefresh,
  MdBarChart,
  MdWarning
} from "react-icons/md";

const CameraView = () => {
  const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";
  const { isConnected, connectionStatus, data, error, reconnect } = useWebSocket(WS_URL);

  const [frames, setFrames] = useState(["", "", "", ""]);
  const [vehicleCounts, setVehicleCounts] = useState([0, 0, 0, 0]);
  const [peopleCounts, setPeopleCounts] = useState([0, 0, 0, 0]);
  const [emergencyVehicles, setEmergencyVehicles] = useState([false, false, false, false]);
  const [timings, setTimings] = useState([0, 0, 0, 0]);
  const [lightStatus, setLightStatus] = useState(["red", "red", "red", "red"]);
  const [phase, setPhase] = useState("green");
  const [phaseRemaining, setPhaseRemaining] = useState(0);
  const [laneRemaining, setLaneRemaining] = useState([0, 0, 0, 0]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [historicalData, setHistoricalData] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    if (data) {
      setFrames(data.frames || ["", "", "", ""]);
      setVehicleCounts(data.vehicle_counts || [0, 0, 0, 0]);
      setPeopleCounts(data.people_counts || [0, 0, 0, 0]);
      setEmergencyVehicles(data.emergency_vehicles || [false, false, false, false]);
      setTimings(data.timings || [0, 0, 0, 0]);
      setLightStatus(data.light_status || ["red", "red", "red", "red"]);
      setPhase(data.phase || "green");
      setPhaseRemaining(data.phase_remaining || 0);
      setLaneRemaining(data.lane_remaining || [0, 0, 0, 0]);
      setLastUpdate(new Date());

      // Store historical data (keep last 100 entries)
      setHistoricalData((prev) => {
        const newData = [...prev, data];
        return newData.slice(-100);
      });
    }
  }, [data]);

  // Connection status indicator
  const statusConfig = useMemo(() => {
    switch (connectionStatus) {
      case "connected":
        return { icon: <MdWifi />, color: "text-green-500", text: "Connected", bg: "bg-green-50" };
      case "connecting":
        return { icon: <MdRefresh className="animate-spin" />, color: "text-yellow-500", text: "Connecting...", bg: "bg-yellow-50" };
      case "reconnecting":
        return { icon: <MdRefresh className="animate-spin" />, color: "text-orange-500", text: "Reconnecting...", bg: "bg-orange-50" };
      case "error":
      case "failed":
        return { icon: <MdSignalWifiOff />, color: "text-red-500", text: "Connection Failed", bg: "bg-red-50" };
      default:
        return { icon: <MdSignalWifiOff />, color: "text-gray-500", text: "Disconnected", bg: "bg-gray-50" };
    }
  }, [connectionStatus]);

  // Format last update time
  const formattedLastUpdate = useMemo(() => {
    if (!lastUpdate) return "Never";
    const now = new Date();
    const diff = Math.floor((now - lastUpdate) / 1000);
    if (diff < 2) return "Just now";
    if (diff < 60) return `${diff}s ago`;
    return lastUpdate.toLocaleTimeString();
  }, [lastUpdate]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-100">
      {/* Header with connection status */}
      <div className="flex-shrink-0 bg-white shadow-sm border-b border-gray-200 px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            🚦 AI Traffic Light System
          </h1>

          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusConfig.bg}`}
              role="status"
              aria-live="polite"
            >
              <span className={statusConfig.color}>{statusConfig.icon}</span>
              <span className={`text-sm font-medium ${statusConfig.color}`}>
                {statusConfig.text}
              </span>
            </div>

            {/* Last Update */}
            <div className="text-xs text-gray-500 hidden sm:block">
              Updated: {formattedLastUpdate}
            </div>

            {/* Reconnect Button */}
            {(connectionStatus === "failed" || connectionStatus === "error") && (
              <button
                onClick={reconnect}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                aria-label="Retry connection"
              >
                <MdRefresh size={16} />
                Retry
              </button>
            )}

            {/* Analytics Button */}
            <button
              onClick={() => setShowAnalytics(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
              aria-label="Show analytics"
            >
              <MdBarChart size={16} />
              <span className="hidden sm:inline">Analytics</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row p-2 gap-2 w-full overflow-hidden">
        {/* Camera Grid */}
        <div className="flex-1 grid grid-cols-2 gap-2 overflow-hidden">
          {frames.map((frame, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-md p-2 flex flex-col min-h-0"
              role="region"
              aria-label={`Lane ${i + 1} camera feed`}
            >
              {/* Camera Feed */}
              <div className="relative w-full flex-1 bg-black rounded-md overflow-hidden mb-2 min-h-0">
                {frame ? (
                  <img
                    src={`data:image/jpeg;base64,${frame}`}
                    alt={`Lane ${i + 1} traffic feed`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-sm">
                    {isConnected ? "Loading..." : "No feed"}
                  </div>
                )}

                {/* Emergency Vehicle Badge */}
                {emergencyVehicles[i] && (
                  <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-md flex items-center gap-1 text-xs font-bold animate-pulse">
                    <MdWarning />
                    EMERGENCY
                  </div>
                )}

                {/* Lane Number Badge */}
                <div className="absolute top-2 left-2 bg-gray-900 bg-opacity-75 text-white px-2 py-1 rounded text-sm font-semibold">
                  Lane {i + 1}
                </div>
              </div>

              {/* Stats */}
              <div className="flex justify-around gap-2 text-sm">
                <div className="text-center flex-1 bg-blue-50 rounded py-2">
                  <div className="text-blue-600 font-bold text-lg" aria-label="Vehicle count">
                    {vehicleCounts[i]}
                  </div>
                  <div className="text-gray-600 text-xs">Vehicles</div>
                </div>
                <div className="text-center flex-1 bg-pink-50 rounded py-2">
                  <div className="text-pink-600 font-bold text-lg" aria-label="Pedestrian count">
                    {peopleCounts[i]}
                  </div>
                  <div className="text-gray-600 text-xs">People</div>
                </div>
                <div className="text-center flex-1 bg-green-50 rounded py-2">
                  <div className="text-green-600 font-bold text-lg" aria-label="Green light duration">
                    {timings[i]}s
                  </div>
                  <div className="text-gray-600 text-xs">Green Time</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar - Traffic Lights */}
        <div className="lg:w-64 bg-white rounded-lg shadow-md p-3 flex flex-col overflow-hidden">
          <h2 className="text-base font-semibold mb-2 text-center text-gray-800">
            Traffic Light Status
          </h2>

          {/* Lane Status */}
          <div className="space-y-2 flex-1 overflow-hidden flex flex-col justify-around">
            {lightStatus.map((status, i) => (
              <div
                key={i}
                className={`flex justify-between items-center p-2 rounded-lg transition-colors ${
                  status === "green"
                    ? "bg-green-50 border-2 border-green-500"
                    : status === "yellow"
                    ? "bg-yellow-50 border-2 border-yellow-500"
                    : "bg-gray-50 border-2 border-gray-300"
                }`}
                role="status"
                aria-label={`Lane ${i + 1} light status: ${status}`}
              >
                <div>
                  <div className="text-sm font-semibold text-gray-800">Lane {i + 1}</div>
                  <div className="text-xs text-gray-500">
                    {laneRemaining[i] ? `${laneRemaining[i]}s remaining` : "Waiting"}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1">
                  {/* Arrow indicator for active lane */}
                  {status === "green" && (
                    <div className="text-lg select-none" aria-hidden="true">
                      ⬆️
                    </div>
                  )}
                  {status === "yellow" && (
                    <div className="text-lg select-none" aria-hidden="true">
                      ⚠️
                    </div>
                  )}

                  {/* Traffic light */}
                  <div
                    className={`w-7 h-7 rounded-full shadow-lg ${
                      status === "green"
                        ? "bg-green-500 animate-pulse"
                        : status === "yellow"
                        ? "bg-yellow-400 animate-pulse"
                        : "bg-red-500"
                    }`}
                    aria-label={`${status} light`}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Phase Info */}
          <div className="mt-2 pt-2 border-t border-gray-200 text-center">
            <div className="text-xs text-gray-600">Current Phase</div>
            <div className="text-base font-bold text-gray-800 capitalize">
              {phase}
            </div>
            <div className="text-xl font-bold text-blue-600">
              {phaseRemaining}s
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-center gap-2">
            <MdWarning size={20} />
            <div>
              <div className="font-semibold">Connection Error</div>
              <div className="text-sm">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <Analytics
          onClose={() => setShowAnalytics(false)}
          historicalData={historicalData}
        />
      )}
    </div>
  );
};

export default CameraView;
