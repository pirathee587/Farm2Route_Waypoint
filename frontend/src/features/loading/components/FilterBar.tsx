import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface FilterBarProps {
  selectedDocks: string[];
  onToggleDock: (dock: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  availableDocks: string[];
  availableStatuses: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedDocks,
  onToggleDock,
  selectedStatus,
  onStatusChange,
  availableDocks,
  availableStatuses,
}) => {
  const [isDockOpen, setIsDockOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const dockRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const statuses = ['All statuses', ...availableStatuses];

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setIsDockOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setIsStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAllDocksSelected =
    selectedDocks.length === 0 || selectedDocks.length === availableDocks.length;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '28px',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px',
      }}
    >
      {/* Title */}
      <h2
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: '#1E293B',
          margin: 0,
        }}
      >
        Trips currently in warehouse
      </h2>

      {/* Right Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
        {/* All Docks Dropdown with Multi-select Checkboxes matching Screenshot 3 */}
        <div ref={dockRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              setIsDockOpen(!isDockOpen);
              setIsStatusOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#D97706',
              padding: '6px 8px',
              borderRadius: '6px',
              backgroundColor: isDockOpen ? '#FEF3C7' : 'transparent',
              transition: 'background-color 0.15s ease',
            }}
          >
            <span>
              {isAllDocksSelected
                ? 'All docks'
                : selectedDocks.length === 1
                ? selectedDocks[0]
                : `${selectedDocks.length} docks`}
            </span>
            <ChevronDown size={14} style={{ marginTop: '1px' }} />
          </button>

          {/* Multi-Select Dropdown Menu (Exact match to Screenshot 3) */}
          {isDockOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
                border: '1px solid #E2E8F0',
                padding: '8px',
                zIndex: 100,
                minWidth: '150px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {availableDocks.map((dock) => {
                  const isChecked = selectedDocks.includes(dock);
                  return (
                    <div
                      key={dock}
                      onClick={() => onToggleDock(dock)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#0F172A',
                        backgroundColor: 'transparent',
                        transition: 'background-color 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F8FAFC';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Checkbox square (matching screenshot) */}
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          backgroundColor: isChecked ? '#F5A623' : '#FFFFFF',
                          border: isChecked ? '1px solid #F5A623' : '1.5px solid #CBD5E1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#111315',
                          flexShrink: 0,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isChecked && <Check size={13} strokeWidth={3} />}
                      </div>

                      <span style={{ userSelect: 'none' }}>{dock}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* All Statuses Dropdown */}
        <div ref={statusRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              setIsStatusOpen(!isStatusOpen);
              setIsDockOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '13px',
              fontWeight: 500,
              color: selectedStatus === 'All statuses' ? '#64748B' : '#0F172A',
              padding: '6px 8px',
              borderRadius: '6px',
              backgroundColor: isStatusOpen ? '#F1F5F9' : 'transparent',
            }}
          >
            <span>{selectedStatus}</span>
            <ChevronDown size={14} style={{ marginTop: '1px' }} />
          </button>

          {isStatusOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                border: '1px solid #E2E8F0',
                padding: '6px',
                zIndex: 100,
                minWidth: '140px',
              }}
            >
              {statuses.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    onStatusChange(st);
                    setIsStatusOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: selectedStatus === st ? 600 : 400,
                    color: selectedStatus === st ? '#0F172A' : '#334155',
                    backgroundColor: selectedStatus === st ? '#F1F5F9' : 'transparent',
                  }}
                >
                  <span>{st}</span>
                  {selectedStatus === st && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
