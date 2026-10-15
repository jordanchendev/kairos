import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";

import { KeyRound } from "lucide-react";

import { getPrincipalApiV1PrincipalGet } from "@/api/poseidon/sdk.gen";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  clearDeviceKey,
  hasDeviceKey,
  poseidonAuthClient,
  setDeviceKey,
  subscribeDeviceKey,
} from "@/lib/api/runtime";

export const DEVICE_KEY_COPY = {
  checking: "Checking key with Poseidon…",
  help: "Stored only in this browser. Used for decision review and release actions.",
  invalid: "Device key format is invalid",
  label: "Device key",
  noKey: "No device key set",
  required: "Device key required for decision review and release actions",
  title: "Poseidon device key",
  trigger: "Device key",
  unavailable: "Poseidon could not verify the key right now. Retry later.",
  unrecognized: "Key not recognized by Poseidon",
} as const;

export type DevicePrincipalStatus =
  | { kind: "none" }
  | { kind: "checking" }
  | { actorId: string; kind: "signed_in" }
  | { kind: "unrecognized" }
  | { kind: "unavailable" };

/** Re-renders the caller whenever the device key is saved or cleared (this tab or another). */
export function useDeviceKeyPresence() {
  return useSyncExternalStore(subscribeDeviceKey, hasDeviceKey, () => false);
}

/** Resolves who Poseidon thinks the stored device key belongs to; sends nothing without a key. */
export async function checkDevicePrincipal(): Promise<DevicePrincipalStatus> {
  if (!hasDeviceKey()) return { kind: "none" };
  try {
    const result = await getPrincipalApiV1PrincipalGet({ client: poseidonAuthClient, throwOnError: false });
    if (result.data) return { actorId: result.data.actor_id, kind: "signed_in" };
    if (result.response?.status === 401) return { kind: "unrecognized" };
    return { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}

/** Validates and stores a typed key. Returns the error copy, or null when stored. */
export function saveDeviceKeyDraft(draft: string): string | null {
  try {
    setDeviceKey(draft);
    return null;
  } catch {
    return DEVICE_KEY_COPY.invalid;
  }
}

function statusLine(status: DevicePrincipalStatus) {
  switch (status.kind) {
    case "none":
      return DEVICE_KEY_COPY.noKey;
    case "checking":
      return DEVICE_KEY_COPY.checking;
    case "signed_in":
      return `Signed in as ${status.actorId}`;
    case "unrecognized":
      return DEVICE_KEY_COPY.unrecognized;
    case "unavailable":
      return DEVICE_KEY_COPY.unavailable;
  }
}

export type DeviceKeyDialogBodyProps = {
  draft: string;
  error: string | null;
  onClear: () => void;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  status: DevicePrincipalStatus;
};

/** Presentational body (also rendered directly by static-markup tests). Never renders the stored key. */
export function DeviceKeyDialogBody({ draft, error, onClear, onDraftChange, onSave, status }: DeviceKeyDialogBodyProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">{DEVICE_KEY_COPY.title}</DialogTitle>
        <DialogDescription>{DEVICE_KEY_COPY.help}</DialogDescription>
      </DialogHeader>
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <p aria-live="polite" className="text-sm [overflow-wrap:anywhere]" role="status">
          {statusLine(status)}
        </p>
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-[0.22em]" htmlFor="device-key-input">
            {DEVICE_KEY_COPY.label}
          </label>
          <input
            aria-describedby={error ? "device-key-error" : undefined}
            aria-invalid={error ? true : undefined}
            autoComplete="off"
            className="min-h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 font-mono text-sm"
            id="device-key-input"
            onChange={(event) => onDraftChange(event.target.value)}
            spellCheck={false}
            type="password"
            value={draft}
          />
        </div>
        {error ? (
          <p className="text-sm text-rose-200" id="device-key-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button className="min-h-11" disabled={status.kind === "none"} onClick={onClear} type="button" variant="outline">
            Clear
          </Button>
          <Button className="min-h-11" disabled={draft === ""} type="submit">
            Save
          </Button>
        </div>
      </form>
    </>
  );
}

export function DeviceKeyDialog({ onChange }: { onChange?: () => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<DevicePrincipalStatus>({ kind: "none" });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus(hasDeviceKey() ? { kind: "checking" } : { kind: "none" });
    void checkDevicePrincipal().then((next) => {
      if (!cancelled) setStatus(next);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const save = () => {
    const failure = saveDeviceKeyDraft(draft);
    setError(failure);
    if (failure) return;
    setDraft("");
    setOpen(false);
    onChange?.();
  };

  const clear = () => {
    clearDeviceKey();
    setDraft("");
    setError(null);
    setStatus({ kind: "none" });
    onChange?.();
  };

  return (
    <Dialog
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setDraft("");
          setError(null);
        }
      }}
      open={open}
    >
      {/* Radix returns focus to this trigger when the dialog closes. */}
      <DialogTrigger asChild>
        <Button className="min-h-11 gap-2" variant="outline">
          <KeyRound aria-hidden="true" className="h-4 w-4" />
          {DEVICE_KEY_COPY.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DeviceKeyDialogBody
          draft={draft}
          error={error}
          onClear={clear}
          onDraftChange={setDraft}
          onSave={save}
          status={status}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Shown by loop panels instead of issuing a request that would fail without a device key. */
export function DeviceKeyRequiredNotice({ onChange }: { onChange?: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-[hsl(var(--border))] p-4 sm:flex-row sm:items-center sm:justify-between" role="status">
      <p className="text-sm">{DEVICE_KEY_COPY.required}</p>
      <DeviceKeyDialog onChange={onChange} />
    </div>
  );
}
