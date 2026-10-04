import React from "react";
import type { DeferredOrdersSummary } from "@/entities/planning/planningTypes";

interface Props {
  summary: DeferredOrdersSummary;
}

interface CardDef {
  label: string;
  valueKey: keyof DeferredOrdersSummary;
  sub: string;
  dotColor: string;
}

const CARDS: CardDef[] = [
  { label: "TOTAL DEFERRED", valueKey: "totalDeferred", sub: "Orders",           dotColor: "#F59E0B" },
  { label: "CAPACITY",       valueKey: "capacity",      sub: "Capacity related",  dotColor: "#EF4444" },
  { label: "WINDOW",         valueKey: "window",        sub: "Time window",       dotColor: "#F97316" },
  { label: "VEHICLE",        valueKey: "vehicle",       sub: "Vehicle issue",     dotColor: "#3B82F6" },
  { label: "OTHER",          valueKey: "other",         sub: "Other reason",      dotColor: "#8B5CF6" },
];

export const DeferredSummaryCards: React.FC<Props> = ({ summary }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: "12px",
      marginBottom: "20px",
    }}
  >
    {CARDS.map((card) => (
      <div
        key={card.label}
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: card.dotColor,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#64748b",
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
            }}
          >
            {card.label}
          </span>
        </div>
        <div
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "#0f172a",
            lineHeight: 1.1,
          }}
        >
          {summary[card.valueKey]}
        </div>
        <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}>
          {card.sub}
        </div>
      </div>
    ))}
  </div>
);
