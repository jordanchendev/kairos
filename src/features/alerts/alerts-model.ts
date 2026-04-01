import type { AlertItem } from "@/api/poseidon/types.gen";

export type AlertSeverity = "critical" | "info" | "warning";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
});

export function deriveAlertSeverity(alert: AlertItem): AlertSeverity {
  const rawSeverity = alert.data?.severity ?? alert.data?.level;
  const severity = typeof rawSeverity === "string" ? rawSeverity.toLowerCase() : "";

  if (["critical", "fatal", "error"].includes(severity)) {
    return "critical";
  }

  if (["warning", "warn"].includes(severity)) {
    return "warning";
  }

  return "info";
}

export function getAlertTimestamp(alert: AlertItem) {
  const explicitTimestamp = alert.data?.timestamp ?? alert.data?.created_at;

  if (typeof explicitTimestamp === "string") {
    return explicitTimestamp;
  }

  const rawStreamTimestamp = Number(alert.id.split("-")[0]);

  if (Number.isNaN(rawStreamTimestamp)) {
    return null;
  }

  return new Date(rawStreamTimestamp).toISOString();
}

export function getAlertFreshnessLabel(alert: AlertItem, now = new Date()) {
  const timestamp = getAlertTimestamp(alert);

  if (!timestamp) {
    return "unknown";
  }

  const parsed = new Date(timestamp);
  const deltaMs = Math.max(0, now.getTime() - parsed.getTime());
  const minutes = Math.floor(deltaMs / (60 * 1000));

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

export function formatAlertTimestamp(alert: AlertItem) {
  const timestamp = getAlertTimestamp(alert);

  if (!timestamp) {
    return "Unknown";
  }

  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? timestamp : dateTimeFormatter.format(parsed);
}

export function getAlertDescription(alert: AlertItem) {
  const message = alert.data?.message ?? alert.data?.summary ?? alert.data?.reason;
  return typeof message === "string" && message ? message : JSON.stringify(alert.data);
}
