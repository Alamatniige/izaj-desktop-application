"use client";

import React from "react";

interface SalesSortModalProps {
  isOpen: boolean;
  sortOption: string;
  onClose: () => void;
  onSortChange: (option: string) => void;
}

const SalesSortModal: React.FC<SalesSortModalProps> = ({
  isOpen,
  sortOption,
  onClose,
  onSortChange,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-50"
        onClick={onClose}
      />
      {/* Bottom Sheet Modal */}
      <div
        id="sort-modal"
        className="fixed left-0 right-0 bottom-0 z-50 animate-slideUp bg-white shadow-2xl w-[100vw]"
        style={{
          minHeight: '50vh',
          maxHeight: '70vh',
          height: 'auto',
          overflowY: 'auto',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div className="flex justify-between items-center px-4 pt-4 pb-2 border-b">
          <span className="text-base font-bold">Sort by</span>
          <button
            className="text-2xl text-gray-500 hover:text-black"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="flex flex-col px-4 py-2">
          {['Alphabetical, A-Z', 'Alphabetical, Z-A', 'Price, Low to High', 'Price, High to Low'].map(option => (
            <button
              key={option}
              onClick={() => onSortChange(option)}
              className={`block w-full text-left px-5 py-3 text-sm rounded-lg mb-1 hover:bg-gray-100 transition-colors ${
                sortOption === option ? 'font-bold text-black bg-gray-100' : 'text-gray-700'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideUp { animation: slideUp 0.25s cubic-bezier(0.4,0,0.2,1); }
      `}</style>
    </>
  );
};

export default SalesSortModal;
