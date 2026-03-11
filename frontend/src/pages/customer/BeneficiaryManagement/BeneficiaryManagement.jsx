import React, { useEffect, useState } from "react";
import "./BeneficiaryManagement.css";
import {
  fetchBeneficiaries,
  addBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
} from "../../../services/beneficiaryService";
import BeneficiaryFormModal from "../../../components/customer/BeneficiaryFormModal";
import DeleteConfirmModal from "../../../components/admin/DeleteConfirmModal";
import Pagination from "../../../components/common/Pagination";
import { useToast } from "../../../context/ToastContext";

const BeneficiaryManagement = () => {
  const toast = useToast();
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchBeneficiaries();
        setBeneficiaries(data.beneficiaries || []);
        setStatistics(data.statistics || null);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load beneficiaries");
      } finally {
        setLoading(false);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBeneficiaries = async () => {
    try {
      setLoading(true);
      const data = await fetchBeneficiaries();
      setBeneficiaries(data.beneficiaries || []);
      setStatistics(data.statistics || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load beneficiaries");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (formData) => {
    try {
      await addBeneficiary(formData);
      toast.success("Beneficiary added successfully!");
      setShowAddModal(false);
      loadBeneficiaries();
    } catch (err) {
      throw new Error(err?.response?.data?.message || "Failed to add beneficiary");
    }
  };

  const handleEdit = async (formData) => {
    try {
      await updateBeneficiary(selectedBeneficiary.id, formData);
      toast.success("Beneficiary updated successfully!");
      setShowEditModal(false);
      setSelectedBeneficiary(null);
      loadBeneficiaries();
    } catch (err) {
      throw new Error(err?.response?.data?.message || "Failed to update beneficiary");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteBeneficiary(selectedBeneficiary.id);
      toast.success("Beneficiary deleted successfully!");
      setShowDeleteModal(false);
      setSelectedBeneficiary(null);
      loadBeneficiaries();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete beneficiary");
    }
  };

  const openEditModal = (beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setShowEditModal(true);
  };

  const openDeleteModal = (beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setShowDeleteModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
          <p className="mt-4 text-sm text-slate-600">Loading beneficiaries...</p>
        </div>
      </div>
    );
  }

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBeneficiaries = beneficiaries.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-8 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="mt-2 text-base text-slate-600">
            Manage your trusted beneficiaries for secure fund transfers
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-700"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Beneficiary
        </button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-cyan-50 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total</p>
                <p className="text-2xl font-bold text-slate-900">{statistics.total}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Active</p>
                <p className="text-2xl font-bold text-slate-900">{statistics.active}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md">
                <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Pending</p>
                <p className="text-2xl font-bold text-slate-900">{statistics.pending}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-purple-50 to-pink-50 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Remaining</p>
                <p className="text-2xl font-bold text-slate-900">{statistics.remaining}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Beneficiaries Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">Your Beneficiaries</h3>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600">
            {beneficiaries.length} Total
          </span>
        </div>

        {beneficiaries.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="mt-4 text-lg font-semibold text-slate-700">No beneficiaries yet</p>
            <p className="mt-2 text-sm text-slate-500">Add your first beneficiary to start making transfers</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-6 rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Add Your First Beneficiary
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-6 py-4">Beneficiary</th>
                  <th className="px-6 py-4">Account Number</th>
                  <th className="px-6 py-4">Bank / Branch</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Added On</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {currentBeneficiaries.map((beneficiary) => (
                  <tr key={beneficiary.id} className="transition hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{beneficiary.beneficiary_name}</p>
                        {beneficiary.nickname && (
                          <p className="text-xs text-slate-500">"{beneficiary.nickname}"</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-medium text-slate-900">
                        {beneficiary.account_number}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <p className="font-medium text-slate-900">{beneficiary.bank_name || "PQ Bank"}</p>
                        {beneficiary.branch_code && (
                          <p className="text-slate-500">{beneficiary.branch_code}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${
                        beneficiary.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        beneficiary.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {beneficiary.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {new Date(beneficiary.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(beneficiary)}
                          className="rounded-lg bg-indigo-100 p-2 text-indigo-600 transition hover:bg-indigo-200"
                          title="Edit"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDeleteModal(beneficiary)}
                          className="rounded-lg bg-rose-100 p-2 text-rose-600 transition hover:bg-rose-200"
                          title="Delete"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            {beneficiaries.length > itemsPerPage && (
              <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
                <Pagination
                  currentPage={currentPage}
                  totalItems={beneficiaries.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
        <div className="flex items-start gap-3">
          <svg className="h-6 w-6 flex-shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-blue-900">Security Information</p>
            <p className="mt-1 text-sm text-blue-700">
              All beneficiary operations are protected with certificate authentication and RBAC. 
              Account numbers are masked for security. Maximum {statistics?.limit || 50} beneficiaries allowed.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <BeneficiaryFormModal
          mode="add"
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAdd}
        />
      )}

      {showEditModal && selectedBeneficiary && (
        <BeneficiaryFormModal
          mode="edit"
          beneficiary={selectedBeneficiary}
          onClose={() => {
            setShowEditModal(false);
            setSelectedBeneficiary(null);
          }}
          onSubmit={handleEdit}
        />
      )}

      {showDeleteModal && selectedBeneficiary && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedBeneficiary(null);
          }}
          onConfirm={handleDelete}
          title="Delete Beneficiary"
          message={`Are you sure you want to delete "${selectedBeneficiary.beneficiary_name}"? This action cannot be undone.`}
        />
      )}
    </div>
  );
};

export default BeneficiaryManagement;
