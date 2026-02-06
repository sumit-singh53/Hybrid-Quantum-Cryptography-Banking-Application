import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { fetchCustomerOverview } from "../../../services/customerService";
import { getTransactionHistory } from "../../../services/transactionService";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const StatementsReports = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [overviewData, transactionData] = await Promise.all([
        fetchCustomerOverview(),
        getTransactionHistory()
      ]);
      setOverview(overviewData);
      setTransactions(transactionData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const filterTransactionsByMonth = () => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.created_at);
      return txDate.getMonth() === selectedMonth && txDate.getFullYear() === selectedYear;
    });
  };

  const downloadMonthlyStatement = () => {
    const doc = new jsPDF();
    const monthlyTxs = filterTransactionsByMonth();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(6, 182, 212);
    doc.text('PQ Banking', 14, 20);
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Monthly Statement', 14, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`${months[selectedMonth]} ${selectedYear}`, 14, 37);
    
    // Account Info
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Account Holder: ${user?.full_name || user?.name || 'N/A'}`, 14, 50);
    doc.text(`Account Number: ${user?.account_number || 'N/A'}`, 14, 57);
    doc.text(`Balance: ₹${overview?.account_balance?.toLocaleString('en-IN') || '0'}`, 14, 64);
    
    // Transactions Table
    const tableData = monthlyTxs.map(tx => [
      new Date(tx.created_at).toLocaleDateString('en-IN'),
      tx.direction,
      tx.direction === 'SENT' ? tx.to_account : tx.from_account,
      `₹${tx.amount?.toLocaleString('en-IN')}`,
      tx.status
    ]);

    autoTable(doc, {
      startY: 75,
      head: [['Date', 'Type', 'Account', 'Amount', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [6, 182, 212] },
      styles: { fontSize: 9 },
    });

    // Summary
    const totalSent = monthlyTxs.filter(tx => tx.direction === 'SENT').reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const totalReceived = monthlyTxs.filter(tx => tx.direction === 'RECEIVED').reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    const finalY = doc.lastAutoTable.finalY || 75;
    doc.setFontSize(10);
    doc.text(`Total Sent: ₹${totalSent.toLocaleString('en-IN')}`, 14, finalY + 15);
    doc.text(`Total Received: ₹${totalReceived.toLocaleString('en-IN')}`, 14, finalY + 22);
    doc.text(`Net Change: ₹${(totalReceived - totalSent).toLocaleString('en-IN')}`, 14, finalY + 29);
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, 14, doc.internal.pageSize.height - 10);
    doc.text('This is a computer-generated statement and does not require a signature.', 14, doc.internal.pageSize.height - 5);

    doc.save(`statement_${months[selectedMonth]}_${selectedYear}.pdf`);
  };

  const downloadTransactionReceipt = (transaction) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(6, 182, 212);
    doc.text('PQ Banking', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Transaction Receipt', 105, 30, { align: 'center' });
    
    // Receipt Box
    doc.setDrawColor(6, 182, 212);
    doc.setLineWidth(0.5);
    doc.rect(20, 40, 170, 120);
    
    // Transaction Details
    doc.setFontSize(11);
    let y = 55;
    const lineHeight = 8;
    
    const details = [
      ['Transaction ID:', transaction.id || 'N/A'],
      ['Date:', new Date(transaction.created_at).toLocaleString('en-IN')],
      ['Type:', transaction.direction],
      ['From Account:', transaction.from_account || 'N/A'],
      ['To Account:', transaction.to_account || 'N/A'],
      ['Amount:', `₹${transaction.amount?.toLocaleString('en-IN')}`],
      ['Status:', transaction.status],
      ['Purpose:', transaction.purpose || 'Not specified'],
    ];
    
    details.forEach(([label, value]) => {
      doc.setTextColor(100, 100, 100);
      doc.text(label, 30, y);
      doc.setTextColor(0, 0, 0);
      doc.text(String(value), 80, y);
      y += lineHeight;
    });
    
    // Status Badge
    if (transaction.status === 'APPROVED' || transaction.status === 'approved') {
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(30, y + 5, 40, 10, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text('APPROVED', 50, y + 11, { align: 'center' });
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, 105, 180, { align: 'center' });
    doc.text('This is a computer-generated receipt and does not require a signature.', 105, 185, { align: 'center' });
    doc.text('For inquiries, please contact your branch or visit our website.', 105, 190, { align: 'center' });
    
    doc.save(`receipt_${transaction.id}.pdf`);
  };

  const downloadAllTransactions = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(6, 182, 212);
    doc.text('PQ Banking', 14, 20);
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Complete Transaction History', 14, 30);
    
    // Account Info
    doc.setFontSize(11);
    doc.text(`Account Holder: ${user?.full_name || user?.name || 'N/A'}`, 14, 45);
    doc.text(`Account Number: ${user?.account_number || 'N/A'}`, 14, 52);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 59);
    
    // All Transactions Table
    const tableData = transactions.map(tx => [
      new Date(tx.created_at).toLocaleDateString('en-IN'),
      tx.direction,
      tx.direction === 'SENT' ? tx.to_account : tx.from_account,
      `₹${tx.amount?.toLocaleString('en-IN')}`,
      tx.status
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['Date', 'Type', 'Account', 'Amount', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [6, 182, 212] },
      styles: { fontSize: 8 },
    });

    doc.save('all_transactions.pdf');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
          <p className="text-slate-600">Loading statements...</p>
        </div>
      </div>
    );
  }

  const monthlyTransactions = filterTransactionsByMonth();

  return (
    <div className="space-y-6 font-['Space_Grotesk','Segoe_UI',sans-serif]">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Statements & Reports</h2>
        <p className="mt-1 text-base text-slate-600">
          Download your transaction statements and receipts
        </p>
      </div>

      {/* Account Summary Card */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-cyan-50/30 p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Account Summary</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-slate-500">Account Holder</p>
            <p className="text-lg font-semibold text-slate-900">{user?.full_name || user?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Account Number</p>
            <p className="text-lg font-mono font-semibold text-slate-900">{user?.account_number || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Current Balance</p>
            <p className="text-lg font-semibold text-cyan-600">₹{overview?.account_balance?.toLocaleString('en-IN') || '0'}</p>
          </div>
        </div>
      </div>

      {/* Monthly Statement */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Monthly Statement</h3>
        <p className="text-sm text-slate-500 mb-4">Select a month to download your statement</p>
        
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          >
            {months.map((month, idx) => (
              <option key={idx} value={idx}>{month}</option>
            ))}
          </select>
          
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <button
            onClick={downloadMonthlyStatement}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-2 font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:bg-cyan-600 hover:shadow-xl"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Statement
          </button>
        </div>

        {/* Month Preview */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h4 className="font-semibold text-slate-900 mb-2">
            {months[selectedMonth]} {selectedYear} Summary
          </h4>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Total Transactions</p>
              <p className="text-lg font-semibold text-slate-900">{monthlyTransactions.length}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Sent</p>
              <p className="text-lg font-semibold text-rose-600">
                ₹{monthlyTransactions.filter(tx => tx.direction === 'SENT').reduce((sum, tx) => sum + (tx.amount || 0), 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Received</p>
              <p className="text-lg font-semibold text-emerald-600">
                ₹{monthlyTransactions.filter(tx => tx.direction === 'RECEIVED').reduce((sum, tx) => sum + (tx.amount || 0), 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Receipts */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Transaction Receipts</h3>
            <p className="text-sm text-slate-500">Download individual transaction receipts</p>
          </div>
          <button
            onClick={downloadAllTransactions}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-all hover:bg-slate-50 hover:shadow-md"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export All
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 text-sm text-slate-500">No transactions available</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {transactions.slice(0, 20).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4 transition-all hover:bg-white hover:shadow-md"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      tx.direction === 'SENT' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {tx.direction}
                    </span>
                    <span className="font-mono text-sm text-slate-600">
                      {tx.direction === 'SENT' ? tx.to_account : tx.from_account}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
                    <span>{new Date(tx.created_at).toLocaleDateString('en-IN')}</span>
                    <span className="font-semibold text-slate-900">₹{tx.amount?.toLocaleString('en-IN')}</span>
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${
                      tx.status === 'APPROVED' || tx.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      tx.status === 'PENDING' || tx.status === 'pending_review' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => downloadTransactionReceipt(tx)}
                  className="ml-4 flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-700 transition-all hover:bg-cyan-100"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Receipt
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatementsReports;
