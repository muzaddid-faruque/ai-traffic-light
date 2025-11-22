// frontend/src/components/Analytics.jsx
import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { MdClose } from "react-icons/md";

const Analytics = ({ onClose, historicalData }) => {
  const [stats, setStats] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  useEffect(() => {
    // Fetch stats from backend
    fetch(`${API_URL}/stats`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error("Failed to fetch stats:", err));
  }, []);

  // Prepare chart data from historical data
  const trafficTrendData = historicalData.slice(-20).map((entry, idx) => ({
    time: idx,
    lane1: entry.vehicle_counts[0] || 0,
    lane2: entry.vehicle_counts[1] || 0,
    lane3: entry.vehicle_counts[2] || 0,
    lane4: entry.vehicle_counts[3] || 0,
  }));

  const totalVehiclesByLane = [
    {
      lane: "Lane 1",
      vehicles: historicalData.reduce((sum, e) => sum + (e.vehicle_counts[0] || 0), 0),
    },
    {
      lane: "Lane 2",
      vehicles: historicalData.reduce((sum, e) => sum + (e.vehicle_counts[1] || 0), 0),
    },
    {
      lane: "Lane 3",
      vehicles: historicalData.reduce((sum, e) => sum + (e.vehicle_counts[2] || 0), 0),
    },
    {
      lane: "Lane 4",
      vehicles: historicalData.reduce((sum, e) => sum + (e.vehicle_counts[3] || 0), 0),
    },
  ];

  const totalPeopleByLane = [
    {
      lane: "Lane 1",
      people: historicalData.reduce((sum, e) => sum + (e.people_counts[0] || 0), 0),
    },
    {
      lane: "Lane 2",
      people: historicalData.reduce((sum, e) => sum + (e.people_counts[1] || 0), 0),
    },
    {
      lane: "Lane 3",
      people: historicalData.reduce((sum, e) => sum + (e.people_counts[2] || 0), 0),
    },
    {
      lane: "Lane 4",
      people: historicalData.reduce((sum, e) => sum + (e.people_counts[3] || 0), 0),
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">📊 Traffic Analytics</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close analytics"
          >
            <MdClose size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* System Statistics */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Total Frames</div>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.total_frames_processed.toLocaleString()}
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Total Vehicles</div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.total_vehicles_detected.toLocaleString()}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Total People</div>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.total_people_detected.toLocaleString()}
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Emergency Vehicles</div>
                <div className="text-2xl font-bold text-red-600">
                  {stats.emergency_vehicles_detected}
                </div>
              </div>
            </div>
          )}

          {/* Traffic Trend Line Chart */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Real-Time Traffic Trend (Last 20 Updates)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trafficTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" label={{ value: "Time", position: "insideBottom", offset: -5 }} />
                <YAxis label={{ value: "Vehicle Count", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="lane1" stroke="#ef4444" name="Lane 1" />
                <Line type="monotone" dataKey="lane2" stroke="#3b82f6" name="Lane 2" />
                <Line type="monotone" dataKey="lane3" stroke="#10b981" name="Lane 3" />
                <Line type="monotone" dataKey="lane4" stroke="#f59e0b" name="Lane 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Total Vehicles by Lane */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Total Vehicles Detected by Lane
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={totalVehiclesByLane}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="lane" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="vehicles" fill="#3b82f6" name="Vehicles" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Total People by Lane */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Total Pedestrians Detected by Lane
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={totalPeopleByLane}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="lane" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="people" fill="#10b981" name="Pedestrians" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Metrics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  System Performance
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Processing Time:</span>
                    <span className="font-medium">
                      {(stats.average_processing_time * 1000).toFixed(2)} ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Uptime:</span>
                    <span className="font-medium">
                      {Math.floor(stats.uptime_seconds / 60)} minutes
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Connections:</span>
                    <span className="font-medium">{stats.active_connections}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Detection Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Detections:</span>
                    <span className="font-medium">
                      {(stats.total_vehicles_detected + stats.total_people_detected).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vehicle/Person Ratio:</span>
                    <span className="font-medium">
                      {stats.total_people_detected > 0
                        ? (stats.total_vehicles_detected / stats.total_people_detected).toFixed(2)
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Emergency Alerts:</span>
                    <span className="font-medium text-red-600">
                      {stats.emergency_vehicles_detected}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
