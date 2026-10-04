import React, { useState } from 'react';
import type { AffectedOrder } from '@/entities/planning/planningTypes';
import { ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

interface AffectedOrdersTableProps {
  orders: AffectedOrder[];
  selectedOrderId: string;
  onSelectOrder: (order: AffectedOrder) => void;
}

export const AffectedOrdersTable: React.FC<AffectedOrdersTableProps> = ({
  orders,
  selectedOrderId,
  onSelectOrder,
}) => {
  const [showAll, setShowAll] = useState(false);

  const unresolvedCount = orders.filter((o) => o.decisionState === 'Unresolved').length;
  const displayedOrders = showAll ? orders : orders.slice(0, 5);

  const getRiskBadge = (risk: AffectedOrder['risk']) => {
    switch (risk) {
      case 'High Risk':
        return {
          bg: '#FEE2E2',
          text: '#DC2626',
          label: 'High Risk',
        };
      case 'Capacity':
        return {
          bg: '#FEF3C7',
          text: '#D97706',
          label: 'Capacity',
        };
      case 'Lower':
      default:
        return {
          bg: '#DCFCE7',
          text: '#16A34A',
          label: 'Lower',
        };
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Card Header */}
      <div
        style={{
          padding: '18px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 2px',
            }}
          >
            Affected Orders
          </h2>
          <p
            style={{
              fontSize: '12px',
              color: '#64748b',
              margin: 0,
            }}
          >
            {unresolvedCount} orders require a serve or defer decision
          </p>
        </div>

        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#D97706',
            backgroundColor: '#FEF3C7',
            padding: '4px 10px',
            borderRadius: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {unresolvedCount} REQUIRE DECISION
        </span>
      </div>

      {/* Table */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: '1px solid #f1f5f9',
                backgroundColor: '#ffffff',
              }}
            >
              <th
                style={{
                  padding: '12px 24px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                ORDER
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                OUTLET
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                REQUIREMENT
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                WINDOW
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                RISK
              </th>
              <th style={{ width: '40px', padding: '12px 16px' }} />
            </tr>
          </thead>
          <tbody>
            {displayedOrders.map((order) => {
              const isSelected = order.id === selectedOrderId;
              const riskBadge = getRiskBadge(order.risk);

              return (
                <tr
                  key={order.id}
                  onClick={() => onSelectOrder(order)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#FEF9C3' : 'transparent',
                    borderBottom: '1px solid #f1f5f9',
                    position: 'relative',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {/* Order ID + Trip indicator */}
                  <td
                    style={{
                      padding: '14px 24px',
                      position: 'relative',
                    }}
                  >
                    {isSelected && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '3px',
                          backgroundColor: '#F59E0B',
                        }}
                      />
                    )}
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0f172a',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {order.id}
                    </div>
                    {order.currentTripId && (
                      <div
                        style={{
                          fontSize: '10px',
                          color: '#94a3b8',
                          fontWeight: 500,
                          marginTop: '2px',
                        }}
                      >
                        CURRENT TRIP · {order.currentTripId}
                      </div>
                    )}
                  </td>

                  {/* Outlet */}
                  <td
                    style={{
                      padding: '14px 16px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#1e293b',
                    }}
                  >
                    {order.outletShort}
                  </td>

                  {/* Requirement */}
                  <td style={{ padding: '14px 16px' }}>
                    {order.requirement === 'Chilled' ? (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#0284C7',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        ❄ Chilled
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          color: '#475569',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        □ Ambient
                      </span>
                    )}
                  </td>

                  {/* Window */}
                  <td
                    style={{
                      padding: '14px 16px',
                      fontSize: '12px',
                      fontWeight: order.timeSensitive ? 600 : 400,
                      color: order.timeSensitive ? '#DC2626' : '#1e293b',
                    }}
                  >
                    {order.deliveryWindow}
                  </td>

                  {/* Risk Badge */}
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: riskBadge.text,
                        backgroundColor: riskBadge.bg,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        display: 'inline-block',
                      }}
                    >
                      {riskBadge.label}
                    </span>
                  </td>

                  {/* Chevron */}
                  <td
                    style={{
                      padding: '14px 16px',
                      textAlign: 'right',
                      color: isSelected ? '#0f172a' : '#94a3b8',
                    }}
                  >
                    <ChevronRight size={15} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '14px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #f1f5f9',
        }}
      >
        <span style={{ fontSize: '12px', color: '#64748b' }}>
          Showing {displayedOrders.length} of {orders.length} affected orders
        </span>

        {orders.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#3B82F6',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: 0,
            }}
          >
            {showAll ? (
              <>
                Show fewer <ChevronUp size={14} />
              </>
            ) : (
              <>
                View all affected orders <ChevronDown size={14} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
