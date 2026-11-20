import React from 'react';
import { X } from 'lucide-react';
import { AbaKhqrCard } from './AbaKhqrCard';

interface AbaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amountUsd?: number;
  orderDescription?: string;
}

export const AbaPaymentModal: React.FC<AbaPaymentModalProps> = ({
  isOpen,
  onClose,
  amountUsd,
  orderDescription,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition"
          aria-label="បិទ"
        >
          <X className="w-4 h-4" />
        </button>

        <AbaKhqrCard
          amountUsd={amountUsd}
          orderDescription={orderDescription}
          onOpenTelegram={onClose}
          showCardHeader={true}
        />
      </div>
    </div>
  );
};
