import React, { useState, useEffect } from "react";
import { fetchDataIntegrityVerification } from "../../../services/auditorClerkService";
import "./DataIntegrityVerification.css";

const DataIntegrityVerification = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [filters, setFilters] = useState({
        recordType: "all",
        verificationResult: "all",
        dateRange: "7d",
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRecord, setSelectedRecord] = useState(null);

    useEffect(() => {
        loadData();
    }, [filters]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await fetchDataIntegrityVerification(filters);
            setData(result);
        } catch (err) {
            console.error("Failed to load data integrity verification:", err);
            setError(err.response?.data?.message || "Failed to load verification data");
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const getStatusBadgeClass = (result) => {
        switch (result) {
            case "Valid":
                return "bg-green-100 text-green-800 border-green-200";
            case "Failed":
            case "Tampered":
                return "bg-red-100 text-red-800 border-red-200";
            case "Unknown":
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getStatusIcon = (result) => {
        switch (result) {
            case "Valid":
                return "✓";
            case "Failed":
            case "Tampered":
                return "✗";
            case "Unknown":
                return "?";
            default:
                return "•";
        }
    };

    const filteredRecords = data?.records?.filter((record) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            record.record_id?.toLowerCase().includes(search) ||
            record.record_type?.toLowerCase().includes(search) ||
            record.verification_method?.toLowerCase().includes(search)
        );
    }) || [];

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return "N/A";
        try {
            return new Date(timestamp).toLocaleString();
        } catch {
            return timestamp;
        }
    };

    if (loading && !data) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading verification data...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                        <div className="flex items-center">
                            <span className="text-red-600 text-2xl mr-3">⚠</span>
                            <div>
                                <h3 className="text-red-800 font-semibold">Error Loading Data</h3>
                                <p className="text-red-600 mt-1">{error}</p>
                            </div>
                        </div>
                        <button
                            onClick={loadData}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 mt-2">
                                Read-only verification of transaction and audit log integrity
                            </p>
                        </div>
                        <button
                            onClick={loadData}
                            disabled={loading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            <span className="mr-2">↻</span>
                            {loading ? "Refreshing..." : "Refresh"}
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-xl shadow-md border border-blue-100 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Total Checked</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">
                                    {data?.summary?.total_checked || 0}
                                </p>
                            </div>
                            <div className="bg-blue-100 rounded-full p-3">
                                <span className="text-2xl">📊</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md border border-green-100 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Valid Records</p>
                                <p className="text-3xl font-bold text-green-600 mt-2">
                                    {data?.summary?.total_valid || 0}
                                </p>
                            </div>
                            <div className="bg-green-100 rounded-full p-3">
                                <span className="text-2xl">✓</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md border border-red-100 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Failed/Tampered</p>
                                <p className="text-3xl font-bold text-red-600 mt-2">
                                    {data?.summary?.total_failed || 0}
                                </p>
                            </div>
                            <div className="bg-red-100 rounded-full p-3">
                                <span className="text-2xl">✗</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md border border-indigo-100 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Integrity Score</p>
                                <p className="text-3xl font-bold text-indigo-600 mt-2">
                                    {data?.summary?.integrity_score || 0}%
                                </p>
                            </div>
                            <div className="bg-indigo-100 rounded-full p-3">
                                <span className="text-2xl">🎯</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Breakdown Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <span className="mr-2">💳</span>
                            Transaction Records
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Total Verified:</span>
                                <span className="font-semibold text-gray-900">
                                    {data?.breakdown?.transactions?.total || 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Valid:</span>
                                <span className="font-semibold text-green-600">
                                    {data?.breakdown?.transactions?.valid || 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Failed:</span>
                                <span className="font-semibold text-red-600">
                                    {data?.breakdown?.transactions?.failed || 0}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <span className="mr-2">📝</span>
                            Audit Log Records
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Total Verified:</span>
                                <span className="font-semibold text-gray-900">
                                    {data?.breakdown?.audit_logs?.total || 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Valid:</span>
                                <span className="font-semibold text-green-600">
                                    {data?.breakdown?.audit_logs?.valid || 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Failed:</span>
                                <span className="font-semibold text-red-600">
                                    {data?.breakdown?.audit_logs?.failed || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Record Type
                            </label>
                            <select
                                value={filters.recordType}
                                onChange={(e) => handleFilterChange("recordType", e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="all">All Types</option>
                                <option value="Transaction">Transaction</option>
                                <option value="Audit Log">Audit Log</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Verification Result
                            </label>
                            <select
                                value={filters.verificationResult}
                                onChange={(e) => handleFilterChange("verificationResult", e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="all">All Results</option>
                                <option value="Valid">Valid</option>
                                <option value="Failed">Failed</option>
                                <option value="Tampered">Tampered</option>
                                <option value="Unknown">Unknown</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date Range
                            </label>
                            <select
                                value={filters.dateRange}
                                onChange={(e) => handleFilterChange("dateRange", e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="1d">Last 24 Hours</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="30d">Last 30 Days</option>
                                <option value="90d">Last 90 Days</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Search
                            </label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search records..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Records Table */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Verification Records ({filteredRecords.length})
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Record ID
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Method
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Result
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Timestamp
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                            No records found matching your filters
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRecords.map((record, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-mono text-gray-900">
                                                    {record.record_id?.substring(0, 16)}...
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-900">
                                                    {record.record_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-600">
                                                    {record.verification_method}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(
                                                        record.verification_result
                                                    )}`}
                                                >
                                                    <span className="mr-1">
                                                        {getStatusIcon(record.verification_result)}
                                                    </span>
                                                    {record.verification_result}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {formatTimestamp(record.timestamp)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => setSelectedRecord(record)}
                                                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Security Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-start">
                        <span className="text-blue-600 text-2xl mr-3">ℹ</span>
                        <div>
                            <h4 className="text-blue-900 font-semibold mb-2">Security & Compliance Notice</h4>
                            <ul className="text-blue-800 text-sm space-y-1">
                                <li>• All verification operations are read-only and logged for audit purposes</li>
                                <li>• Sensitive data (keys, raw hashes, payloads) are never exposed in this interface</li>
                                <li>• Integrity verification uses cryptographic hash chains and digital signatures</li>
                                <li>• Any tampering attempts will be immediately flagged and reported</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedRecord && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-gray-900">
                                    Verification Details
                                </h3>
                                <button
                                    onClick={() => setSelectedRecord(null)}
                                    className="text-gray-400 hover:text-gray-600 text-2xl"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-600">Record ID</label>
                                <p className="text-gray-900 font-mono text-sm mt-1 break-all">
                                    {selectedRecord.record_id}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600">Record Type</label>
                                <p className="text-gray-900 mt-1">{selectedRecord.record_type}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600">Verification Method</label>
                                <p className="text-gray-900 mt-1">{selectedRecord.verification_method}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600">Verification Result</label>
                                <p className="mt-1">
                                    <span
                                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeClass(
                                            selectedRecord.verification_result
                                        )}`}
                                    >
                                        <span className="mr-1">
                                            {getStatusIcon(selectedRecord.verification_result)}
                                        </span>
                                        {selectedRecord.verification_result}
                                    </span>
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600">Integrity Hash (Truncated)</label>
                                <p className="text-gray-900 font-mono text-sm mt-1 break-all">
                                    {selectedRecord.integrity_hash}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600">Timestamp</label>
                                <p className="text-gray-900 mt-1">{formatTimestamp(selectedRecord.timestamp)}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600">Last Verified</label>
                                <p className="text-gray-900 mt-1">{formatTimestamp(selectedRecord.last_verified)}</p>
                            </div>
                            {selectedRecord.metadata && (
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Metadata</label>
                                    <div className="mt-2 bg-gray-50 rounded-lg p-4 space-y-2">
                                        {Object.entries(selectedRecord.metadata).map(([key, value]) => (
                                            <div key={key} className="flex justify-between">
                                                <span className="text-gray-600 text-sm capitalize">
                                                    {key.replace(/_/g, " ")}:
                                                </span>
                                                <span className="text-gray-900 text-sm font-medium">
                                                    {typeof value === "object" ? JSON.stringify(value) : value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-yellow-800 text-sm">
                                    <strong>Note:</strong> This is a read-only view. No modifications can be made to
                                    verification records. All access is logged for compliance.
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200">
                            <button
                                onClick={() => setSelectedRecord(null)}
                                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataIntegrityVerification;
