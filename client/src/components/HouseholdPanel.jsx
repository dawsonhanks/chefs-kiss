import { useState } from "react";

export default function HouseholdPanel({
  signedIn,
  isSharedKitchen,
  householdFileId,
  lastSyncedAt,
  syncing,
  onJoin,
  onLeave,
  onRefresh,
  joinError,
}) {
  const [expanded, setExpanded] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(null);

  if (!signedIn) return null;

  const shareUrl =
    typeof window !== "undefined" && householdFileId
      ? `${window.location.origin}${window.location.pathname}?join=${householdFileId}`
      : "";

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      await onJoin(joinCode.trim());
      setJoinCode("");
      setExpanded(false);
    } finally {
      setJoining(false);
    }
  };

  return (
    <section className="mt-3 rounded-xl border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-card)] p-3 text-xs">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-medium text-[var(--color-kitchen-cream)]">
          {isSharedKitchen ? "👫 Shared kitchen" : "👫 Share kitchen with partner"}
        </span>
        <span className="text-[var(--color-kitchen-muted)]">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-4 border-t border-[var(--color-kitchen-border)] pt-3">
          {isSharedKitchen ? (
            <>
              <p className="text-[var(--color-kitchen-muted)]">
                You and your partner sync to the same pantry, recipes, and
                shopping list via Google Drive.
              </p>
              {lastSyncedAt && (
                <p className="text-[var(--color-kitchen-muted)]">
                  Last synced{" "}
                  {lastSyncedAt.toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {syncing && " · refreshing…"}
                </p>
              )}
              <div className="space-y-2">
                <p className="font-medium text-[var(--color-kitchen-cream)]">
                  Invite link
                </p>
                <div className="flex gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-[var(--color-kitchen-surface)] px-2 py-1.5 text-[10px] text-[var(--color-kitchen-amber)]">
                    {shareUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyText(shareUrl, "link")}
                    className="shrink-0 rounded-lg border border-[var(--color-kitchen-amber)]/50 px-2 py-1 text-[var(--color-kitchen-amber)]"
                  >
                    {copied === "link" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={syncing}
                  className="rounded-lg border border-[var(--color-kitchen-border)] px-3 py-1.5 hover:border-[var(--color-kitchen-amber)] disabled:opacity-50"
                >
                  Refresh now
                </button>
                <button
                  type="button"
                  onClick={onLeave}
                  className="rounded-lg px-3 py-1.5 text-[var(--color-kitchen-muted)] hover:text-[var(--color-kitchen-danger)]"
                >
                  Use my own kitchen
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="font-medium text-[var(--color-kitchen-cream)]">
                  Share your kitchen
                </p>
                <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[var(--color-kitchen-muted)]">
                  <li>Copy the invite link below and send it to your partner.</li>
                  <li>
                    In{" "}
                    <a
                      href="https://drive.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-kitchen-amber)] underline"
                    >
                      Google Drive
                    </a>
                    , find{" "}
                    <strong className="text-[var(--color-kitchen-cream)]">
                      chefs-assistant-data.json
                    </strong>
                    , share it with their Google email as{" "}
                    <strong className="text-[var(--color-kitchen-cream)]">
                      Editor
                    </strong>
                    .
                  </li>
                  <li>They open the link, sign in, and tap Join.</li>
                </ol>
                {householdFileId && shareUrl && (
                  <div className="mt-2 flex gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-lg bg-[var(--color-kitchen-surface)] px-2 py-1.5 text-[10px] text-[var(--color-kitchen-amber)]">
                      {shareUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyText(shareUrl, "link")}
                      className="shrink-0 rounded-lg bg-[var(--color-kitchen-amber)] px-2 py-1 font-semibold text-[#0f0f0f]"
                    >
                      {copied === "link" ? "Copied!" : "Copy link"}
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--color-kitchen-border)] pt-3">
                <p className="font-medium text-[var(--color-kitchen-cream)]">
                  Join partner&apos;s kitchen
                </p>
                <p className="mt-1 text-[var(--color-kitchen-muted)]">
                  Paste the invite link or code they sent you (after they shared
                  the Drive file with your Google account).
                </p>
                <form onSubmit={handleJoin} className="mt-2 flex gap-2">
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="Invite link or code"
                    className="min-w-0 flex-1 rounded-lg border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-kitchen-amber)]"
                  />
                  <button
                    type="submit"
                    disabled={joining || !joinCode.trim()}
                    className="shrink-0 rounded-lg bg-[var(--color-kitchen-amber)] px-4 py-2 text-sm font-semibold text-[#0f0f0f] disabled:opacity-50"
                  >
                    {joining ? "…" : "Join"}
                  </button>
                </form>
                {joinError && (
                  <p className="mt-2 text-[var(--color-kitchen-danger)]">
                    {joinError}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
