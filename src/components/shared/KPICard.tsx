interface KPICardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  variant?: "default" | "danger" | "success" | "warning";
}

const VARIANT_STYLES = {
  default: "border-gray-700",
  danger: "border-red-700 bg-red-950/30",
  success: "border-green-700 bg-green-950/30",
  warning: "border-yellow-700 bg-yellow-950/30",
};

export default function KPICard({ label, value, sublabel, variant = "default" }: KPICardProps) {
  return (
    <div className={`bg-gray-900 border rounded-lg p-4 ${VARIANT_STYLES[variant]}`}>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{typeof value === "number" ? `$${value.toLocaleString()}` : value}</p>
      {sublabel && <p className="text-xs text-gray-500 mt-1">{sublabel}</p>}
    </div>
  );
}
