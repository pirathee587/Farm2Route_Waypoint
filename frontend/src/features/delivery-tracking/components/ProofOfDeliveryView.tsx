import React, { useState } from 'react';
import {
  ChevronLeft,
  Bell,
  Box,
  Check,
  Camera,
  PenTool,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface ProofOfDeliveryViewProps {
  onBack: () => void;
  onConfirmDelivery: () => void;
  onOpenNotifications: () => void;
  outletName?: string;
  outletCode?: string;
  arrivedTime?: string;
}

export const ProofOfDeliveryView: React.FC<ProofOfDeliveryViewProps> = ({
  onBack,
  onConfirmDelivery,
  onOpenNotifications,
  outletName = 'Central Supermarket',
  outletCode = 'OUT014',
  arrivedTime = 'Arrived 08:42 AM',
}) => {
  const [allItemsDelivered, setAllItemsDelivered] = useState<boolean>(false);
  const [deliveryNote, setDeliveryNote] = useState<string>('');
  const [showSignatureModal, setShowSignatureModal] = useState<boolean>(false);
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false);
  const [receiverName, setReceiverName] = useState<string>('A. Nirsanth');
  const [isSuccessModal, setIsSuccessModal] = useState<boolean>(false);
  const [reportedShortfall, setReportedShortfall] = useState<boolean>(false);

  const handleConfirm = () => {
    onConfirmDelivery();
  };

  return (
    <div
      className="driver-screen-content animate-fade-in"
      style={{
        padding: '0 0 110px 0',
        backgroundColor: '#f8fafc',
      }}
    >
      {/* Top Dark Header */}
      <header
        style={{
          backgroundColor: '#0a0e17',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: '#facc15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0a0e17',
              boxShadow: '0 2px 8px rgba(250, 204, 21, 0.4)',
            }}
          >
            <Box size={20} strokeWidth={2.6} />
          </div>
          <span
            style={{
              color: '#facc15',
              fontSize: 18,
              fontWeight: 800,
              fontStyle: 'italic',
              letterSpacing: '-0.3px',
            }}
          >
            Waypoint
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label="Notifications"
          style={{
            background: 'none',
            border: 'none',
            color: '#cbd5e1',
            cursor: 'pointer',
            padding: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bell size={22} strokeWidth={2.2} />
        </button>
      </header>

      {/* Main Inner Content */}
      <div style={{ padding: '16px 20px 0 20px' }}>
        {/* Navigation & Screen Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
            }}
          >
            <ChevronLeft size={22} strokeWidth={2.8} />
          </button>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.4px',
            }}
          >
            Proof of Delivery
          </h1>
        </div>

        {/* Outlet Header Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 22,
            padding: '16px 18px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Yellow circle with black checkmark */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                backgroundColor: '#facc15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0f172a',
                flexShrink: 0,
              }}
            >
              <Check size={22} strokeWidth={3} />
            </div>

            <div>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: '#0f172a',
                  margin: '0 0 2px 0',
                  letterSpacing: '-0.3px',
                }}
              >
                {outletName}
              </h2>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#64748b',
                }}
              >
                {outletCode}
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: 12.5,
              fontWeight: 800,
              color: '#16a34a',
            }}
          >
            {arrivedTime}
          </div>
        </div>

        {/* Delivery check Section */}
        <div style={{ marginBottom: 20 }}>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: '#0f172a',
              margin: '0 0 10px 0',
              letterSpacing: '-0.3px',
            }}
          >
            Delivery check
          </h3>

          {/* All items delivered toggle card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              border: '2px solid #0088ff',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              boxShadow: '0 2px 8px rgba(0, 136, 255, 0.08)',
            }}
          >
            <span
              style={{
                fontSize: 15.5,
                fontWeight: 900,
                color: '#0f172a',
              }}
            >
              All items delivered
            </span>

            {/* Switch Toggle */}
            <div
              onClick={() => setAllItemsDelivered(!allItemsDelivered)}
              style={{
                width: 52,
                height: 30,
                borderRadius: 20,
                backgroundColor: allItemsDelivered ? '#0088ff' : '#e2e8f0',
                padding: 3,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  transform: allItemsDelivered ? 'translateX(22px)' : 'translateX(0px)',
                  transition: 'transform 0.2s ease',
                }}
              />
            </div>
          </div>

          {/* Delivery Check Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Item 1: Milk */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 18,
                border: '1px solid #f1f5f9',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>Milk</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#16a34a', marginTop: 2 }}>
                  Complete
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                Ordered 20
              </div>

              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#16a34a' }}>
                Delivered 20
              </div>
            </div>

            {/* Item 2: Bread (Shortfall highlighted in light red border) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 18,
                border: '1px solid #fecaca',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.05)',
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>Bread</div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                Ordered 30
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                <span style={{ fontSize: 13.5, fontWeight: 900, color: '#0f172a' }}>
                  Delivered 28
                </span>
                <span
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 12,
                  }}
                >
                  Short 2
                </span>
              </div>
            </div>

            {/* Item 3: Vegetables */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 18,
                border: '1px solid #f1f5f9',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>Vegetables</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#16a34a', marginTop: 2 }}>
                  Complete
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                Ordered 15
              </div>

              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#16a34a' }}>
                Delivered 15
              </div>
            </div>
          </div>

          {/* Report shortfall / damage link */}
          <div style={{ textAlign: 'right', marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setReportedShortfall(!reportedShortfall)}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                fontSize: 13.5,
                fontWeight: 800,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              + Report shortfall / damage
            </button>
          </div>

          {reportedShortfall && (
            <div
              style={{
                marginTop: 8,
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 14,
                padding: '10px 14px',
                fontSize: 12.5,
                color: '#991b1b',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertTriangle size={16} />
              <span>Bread shortfall of 2 units reported to Inventory Dispatcher.</span>
            </div>
          )}
        </div>

        {/* Proof Section */}
        <div style={{ marginBottom: 20 }}>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: '#0f172a',
              margin: '0 0 2px 0',
              letterSpacing: '-0.3px',
            }}
          >
            Proof
          </h3>
          <p
            style={{
              fontSize: 12.5,
              color: '#64748b',
              margin: '0 0 12px 0',
            }}
          >
            Get this signed by the store manager or receiving staff at the outlet
          </p>

          {/* Two Proof Cards Row */}
          <div style={{ display: 'flex', gap: 12 }}>
            {/* Signature Card */}
            <div
              onClick={() => setShowSignatureModal(true)}
              style={{
                flex: 1,
                backgroundColor: '#ffffff',
                borderRadius: 20,
                border: '1px solid #f1f5f9',
                padding: '14px 14px 12px 14px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: '#fef9c3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#a16207',
                    flexShrink: 0,
                  }}
                >
                  <PenTool size={18} strokeWidth={2.4} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>
                    Signature
                  </div>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>
                    Receiver's signature
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 4,
                  borderTop: '1px dashed #f1f5f9',
                }}
              >
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: 800,
                    color: '#2563eb',
                    textDecoration: 'underline',
                  }}
                >
                  {receiverName}
                </span>
                <span
                  style={{
                    backgroundColor: '#dcfce7',
                    color: '#16a34a',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: 12,
                  }}
                >
                  Captured
                </span>
              </div>
            </div>

            {/* Photo Card */}
            <div
              onClick={() => setShowPhotoModal(true)}
              style={{
                flex: 1,
                backgroundColor: '#ffffff',
                borderRadius: 20,
                border: '1px solid #f1f5f9',
                padding: '14px 14px 12px 14px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563eb',
                    flexShrink: 0,
                  }}
                >
                  <Camera size={18} strokeWidth={2.4} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>
                    Photo
                  </div>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>
                    Photos of delivered goods
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 4,
                  borderTop: '1px dashed #f1f5f9',
                }}
              >
                <span
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#64748b',
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '3px 12px',
                    borderRadius: 10,
                  }}
                >
                  POD
                </span>
                <span
                  style={{
                    backgroundColor: '#dcfce7',
                    color: '#16a34a',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: 12,
                  }}
                >
                  Captured
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery note Section */}
        <div style={{ marginBottom: 20 }}>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 900,
              color: '#0f172a',
              margin: '0 0 8px 0',
            }}
          >
            Delivery note
          </h3>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="text"
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              placeholder="Optional note"
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: 14,
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                fontSize: 13.5,
                color: '#0f172a',
                outline: 'none',
              }}
            />

            <div
              style={{
                backgroundColor: '#eff6ff',
                borderRadius: 14,
                padding: '8px 12px',
                textAlign: 'center',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: '#2563eb',
                  lineHeight: 1.2,
                }}
              >
                Recorded automatically
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: '#0f172a',
                  marginTop: 2,
                }}
              >
                08:46 AM • 25 Sep 2026
              </div>
            </div>
          </div>
        </div>

        {/* Confirm Delivery Button */}
        <button
          type="button"
          onClick={handleConfirm}
          style={{
            width: '100%',
            backgroundColor: '#facc15',
            color: '#0f172a',
            fontSize: 16.5,
            fontWeight: 900,
            padding: '16px 20px',
            borderRadius: 18,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(250, 204, 21, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
        >
          Confirm Delivery
        </button>
      </div>

      {/* Confirmation Success Modal */}
      {isSuccessModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 24,
              padding: '30px 24px',
              textAlign: 'center',
              maxWidth: 340,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <CheckCircle2
              size={56}
              color="#16a34a"
              style={{ margin: '0 auto 14px auto' }}
            />
            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '0 0 6px 0' }}>
              Delivery Confirmed!
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.4 }}>
              Proof of delivery for {outletName} has been recorded and synced.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
