import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  helper: string;
  accent?: string;
  accentSoft?: string;
  trend?: string;
  trendUp?: boolean;
  icon?: LucideIcon;
};

export function StatCard({
  label,
  value,
  helper,
  accent,
  accentSoft,
  trend,
  trendUp,
  icon: Icon,
}: StatCardProps) {
  const style = {
    "--kpi-accent": accent,
    "--kpi-accent-soft": accentSoft,
  } as React.CSSProperties;

  return (
    <article className="kpi-card glass-card" style={accent ? style : undefined}>
      {Icon && (
        <div className="kpi-icon">
          <Icon size={15} />
        </div>
      )}
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{value}</p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
        <p className="kpi-foot">{helper}</p>
        {trend && (
          <span
            className={`trend-badge ${trendUp === true ? "trend-up" : trendUp === false ? "trend-down" : "trend-neutral"}`}
          >
            {trendUp === true ? "▲" : trendUp === false ? "▼" : "—"} {trend}
          </span>
        )}
      </div>
    </article>
  );
}
