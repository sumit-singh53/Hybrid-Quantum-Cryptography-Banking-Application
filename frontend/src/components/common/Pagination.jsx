import React from "react";

/**
 * Reusable Pagination Component
 * @param {number} currentPage - Current page number (1-indexed)
 * @param {number} totalItems - Total number of items
 * @param {number} itemsPerPage - Items per page
 * @param {function} onPageChange - Callback when page changes
 */
const Pagination = ({ currentPage, totalItems, itemsPerPage, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    if (page !== currentPage) {
      onPageChange(page);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show subset with ellipsis
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
      <div className="text-sm text-slate-400">
        Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to{" "}
        {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:bg-white/5"
        >
          Previous
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === "...") {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-slate-500">
                  ...
                </span>
              );
            }

            return (
              <button
                key={page}
                onClick={() => handlePageClick(page)}
                className={`min-w-[2.5rem] rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  currentPage === page
                    ? "border border-indigo-400/50 bg-indigo-500/20 text-indigo-200"
                    : "border border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:bg-white/5"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;
