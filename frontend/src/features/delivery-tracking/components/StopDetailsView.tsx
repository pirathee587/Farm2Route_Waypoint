import React, { useState, useRef } from 'react';
import {
  ChevronLeft,
  Bell,
  Box,
  Shirt,
  Package,
  AlertCircle,
  Camera,
  PenTool,
  CheckCircle2,
  X,
  Upload,
} from 'lucide-react';

interface StopDetailsViewProps {
  onBack: () => void;
  onOpenCantDeliver: () => void;
  onEnterWaitingWindow: () => void;
  onArrived?: () => void;
  onCompleteDelivery?: () => void;
  onOpenNotifications: () => void;
  stopData?: {
    stopNumber: number;
    outletName: string;
    outletCode: string;
    city: string;
    window: string;
    windowTag: string;
    status: string;
    requirements: string[];
    items: {
      type: 'garments' | 'cartons';
      name: string;
      units: number;
      weight: string;
      storage: string;
    }[];
    previousIssue?: {
      reason: string;
      date: string;
    };
  };
}

export const StopDetailsView: React.FC<StopDetailsViewProps> = ({
  onBack,
  onOpenCantDeliver,
  onEnterWaitingWindow,
  onArrived,
  onCompleteDelivery,
  onOpenNotifications,
  stopData = {
    stopNumber: 3,
    outletName: 'Keells - K-Zone Moratuwa',
    outletCode: 'OUT027',
    city: 'Kandy',
    window: '09:30 AM – 10:00 AM',
    windowTag: 'Mall access window',
    status: 'PENDING',
    requirements: ['Van only', 'Mall bay', 'Access window'],
    items: [
      {
        type: 'garments',
        name: 'Hanging Garments',
        units: 20,
        weight: '32 kg',
        storage: 'Ambient',
      },
      {
        type: 'cartons',
        name: 'Cartons',
        units: 12,
        weight: '16 kg',
        storage: 'Ambient',
      },
    ],
    previousIssue: {
      reason: 'Outlet closed',
      date: '18 Sep 2026',
    },
  },
}) => {
  const [showPodModal, setShowPodModal] = useState<boolean>(false);
  const [recipientName, setRecipientName] = useState<string>('Mr. Bandara (Store Manager)');
  const [hasSignature, setHasSignature] = useState<boolean>(false);
  const [photoUploaded, setPhotoUploaded] = useState<boolean>(false);
  const [deliverySuccess, setDeliverySuccess] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleSimulateSign = () => {
    setHasSignature(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(30, 45);
        ctx.bezierCurveTo(70, 10, 110, 60, 150, 35);
        ctx.bezierCurveTo(180, 20, 210, 65, 240, 40);
        ctx.stroke();
      }
    }
  };

  const handleClearSignature = () => {
    setHasSignature(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleConfirmPod = () => {
    setDeliverySuccess(true);
    setTimeout(() => {
      setShowPodModal(false);
      if (onCompleteDelivery) {
        onCompleteDelivery();
      } else {
        onBack();
      }
    }, 1800);
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
        {/* Navigation & Title Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
              Stop {stopData.stopNumber}
            </h1>
          </div>

          {/* Pending Badge */}
          <span
            style={{
              backgroundColor: '#fef9c3',
              color: '#854d0e',
              border: '1px solid #fde047',
              fontSize: 12,
              fontWeight: 800,
              padding: '5px 14px',
              borderRadius: 20,
              letterSpacing: '0.4px',
            }}
          >
            {stopData.status}
          </span>
        </div>

        {/* Outlet Details Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 24,
            padding: '20px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
            marginBottom: 20,
          }}
        >
          {/* Outlet Icon + Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            {/* Yellow circle with solid black dot */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                backgroundColor: '#facc15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  backgroundColor: '#0f172a',
                }}
              />
            </div>

            <div>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: '#0f172a',
                  margin: '0 0 2px 0',
                  letterSpacing: '-0.3px',
                }}
              >
                {stopData.outletName}
              </h2>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#64748b',
                }}
              >
                {stopData.outletCode} • {stopData.city}
              </div>
            </div>
          </div>

          {/* Delivery Window Row */}
          <div>
            <div
              style={{
                fontSize: 12,
                color: '#64748b',
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Delivery window
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: '#0f172a',
                  letterSpacing: '-0.2px',
                }}
              >
                {stopData.window}
              </span>
              <span
                style={{
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: 14,
                }}
              >
                {stopData.windowTag}
              </span>
            </div>
          </div>
        </div>

        {/* Delivery Requirements Section */}
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
            Delivery requirements
          </h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                backgroundColor: '#fef9c3',
                color: '#854d0e',
                border: '1px solid #fde047',
                fontSize: 12,
                fontWeight: 800,
                padding: '6px 14px',
                borderRadius: 20,
              }}
            >
              Van only
            </span>
            <span
              style={{
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                fontSize: 12,
                fontWeight: 800,
                padding: '6px 14px',
                borderRadius: 20,
              }}
            >
              Mall bay
            </span>
            <span
              style={{
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                fontSize: 12,
                fontWeight: 800,
                padding: '6px 14px',
                borderRadius: 20,
              }}
            >
              Access window
            </span>
          </div>
        </div>

        {/* Delivery Items Section */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <h3
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.3px',
              }}
            >
              Delivery items
            </h3>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: '#64748b',
              }}
            >
              32 units • 48 kg total
            </span>
          </div>

          {/* Item 1 - Hanging Garments */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              border: '1px solid #f1f5f9',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#3b82f6',
                }}
              >
                <Shirt size={22} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 800, color: '#0f172a' }}>
                  Hanging Garments
                </div>
                <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                  20 units • 32 kg
                </div>
              </div>
            </div>
            <span
              style={{
                backgroundColor: '#f1f5f9',
                color: '#475569',
                fontSize: 12,
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: 14,
              }}
            >
              Ambient
            </span>
          </div>

          {/* Item 2 - Cartons */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              border: '1px solid #f1f5f9',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                }}
              >
                <Package size={22} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 800, color: '#0f172a' }}>
                  Cartons
                </div>
                <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                  12 units • 16 kg
                </div>
              </div>
            </div>
            <span
              style={{
                backgroundColor: '#f1f5f9',
                color: '#475569',
                fontSize: 12,
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: 14,
              }}
            >
              Ambient
            </span>
          </div>
        </div>

        {/* Skipped on Previous Run Alert Card */}
        {stopData.previousIssue && (
          <div
            style={{
              backgroundColor: '#fffbeb',
              borderRadius: 20,
              border: '1px solid #fde68a',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                backgroundColor: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                flexShrink: 0,
              }}
            >
              <AlertCircle size={22} strokeWidth={2.4} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: '#0f172a',
                }}
              >
                Skipped on previous run
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: '#dc2626',
                  marginTop: 2,
                }}
              >
                Reason: {stopData.previousIssue.reason} • {stopData.previousIssue.date}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons Row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => {
              if (onArrived) {
                onArrived();
              } else {
                setShowPodModal(true);
              }
            }}
            style={{
              flex: 1.6,
              backgroundColor: '#facc15',
              color: '#0f172a',
              fontSize: 16,
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
            I've Arrived
          </button>

          <button
            type="button"
            onClick={onOpenCantDeliver}
            style={{
              flex: 1,
              backgroundColor: '#ffffff',
              color: '#dc2626',
              fontSize: 15,
              fontWeight: 800,
              padding: '16px 16px',
              borderRadius: 18,
              border: '2px solid #ef4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            Can't Deliver
          </button>
        </div>

        {/* Helper Note Underneath */}
        <p
          style={{
            fontSize: 11.5,
            color: '#64748b',
            textAlign: 'center',
            margin: '0 auto',
            maxWidth: '340px',
            lineHeight: 1.4,
          }}
        >
          Arrival time is recorded automatically. Before 09:30 AM, you'll enter the waiting state.
        </p>

        {/* Quick link to preview waiting state directly */}
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <button
            type="button"
            onClick={onEnterWaitingWindow}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              color: '#2563eb',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            View Early Arrival Waiting Screen →
          </button>
        </div>
      </div>

      {/* Proof of Delivery (POD) Drawer / Modal */}
      {showPodModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              width: '100%',
              maxWidth: 440,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: '24px 20px 32px 20px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.2)',
              animation: 'slideUp 0.25s ease-out',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: 19,
                    fontWeight: 900,
                    color: '#0f172a',
                    margin: '0 0 2px 0',
                  }}
                >
                  Proof of Delivery (POD)
                </h3>
                <div style={{ fontSize: 12.5, color: '#64748b' }}>
                  {stopData.outletName} • {stopData.outletCode}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPodModal(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {deliverySuccess ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '30px 20px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: 20,
                  border: '1px solid #bbf7d0',
                }}
              >
                <CheckCircle2
                  size={52}
                  color="#16a34a"
                  style={{ margin: '0 auto 12px auto' }}
                />
                <h4 style={{ fontSize: 20, fontWeight: 900, color: '#15803d', margin: '0 0 6px 0' }}>
                  Delivery Confirmed!
                </h4>
                <p style={{ fontSize: 13, color: '#166534', margin: 0 }}>
                  Proof of delivery recorded and synced with Supabase storage.
                </p>
              </div>
            ) : (
              <div>
                {/* Early Arrival Warning Banner inside POD */}
                <div
                  style={{
                    backgroundColor: '#eff6ff',
                    borderRadius: 14,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                    fontSize: 12,
                    color: '#1e40af',
                    fontWeight: 600,
                  }}
                >
                  <span>Window: 09:30 AM – 10:00 AM</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPodModal(false);
                      onEnterWaitingWindow();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontSize: 12,
                    }}
                  >
                    Enter Waiting Mode
                  </button>
                </div>

                {/* Recipient Name */}
                <div style={{ marginBottom: 14 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 800,
                      color: '#0f172a',
                      marginBottom: 6,
                    }}
                  >
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#0f172a',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Digital Signature */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <PenTool size={14} /> Recipient Signature
                    </label>
                    {hasSignature && (
                      <button
                        type="button"
                        onClick={handleClearSignature}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: 11,
                          color: '#dc2626',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '2px dashed #cbd5e1',
                      borderRadius: 16,
                      height: 100,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      width={300}
                      height={90}
                      style={{ width: '100%', height: '100%' }}
                    />
                    {!hasSignature && (
                      <button
                        type="button"
                        onClick={handleSimulateSign}
                        style={{
                          position: 'absolute',
                          backgroundColor: '#ffffff',
                          border: '1px solid #cbd5e1',
                          padding: '6px 14px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#0f172a',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                        }}
                      >
                        ✍️ Click to Sign
                      </button>
                    )}
                  </div>
                </div>

                {/* Photo Proof of Delivery */}
                <div style={{ marginBottom: 20 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 800,
                      color: '#0f172a',
                      marginBottom: 6,
                    }}
                  >
                    Photo Proof (Mall Bay / Packages)
                  </label>
                  <div
                    onClick={() => setPhotoUploaded(!photoUploaded)}
                    style={{
                      backgroundColor: photoUploaded ? '#f0fdf4' : '#f8fafc',
                      border: photoUploaded ? '2px solid #86efac' : '2px dashed #cbd5e1',
                      borderRadius: 16,
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {photoUploaded ? (
                      <>
                        <CheckCircle2 size={20} color="#16a34a" />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                          MallBay_OUT027_Proof.jpg attached
                        </span>
                      </>
                    ) : (
                      <>
                        <Camera size={20} color="#64748b" />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>
                          Tap to Take or Upload Delivery Photo
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Submit POD Button */}
                <button
                  type="button"
                  onClick={handleConfirmPod}
                  style={{
                    width: '100%',
                    backgroundColor: '#facc15',
                    color: '#0f172a',
                    fontSize: 16,
                    fontWeight: 900,
                    padding: '16px 20px',
                    borderRadius: 18,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 6px 18px rgba(250, 204, 21, 0.45)',
                  }}
                >
                  Confirm & Complete Delivery
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
