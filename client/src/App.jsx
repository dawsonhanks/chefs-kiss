import { useState } from "react";
import ChefChatTab from "./components/ChefChatTab";
import HistoryTab from "./components/HistoryTab";
import PantryTab from "./components/PantryTab";
import RecipesTab from "./components/RecipesTab";
import ShoppingTab from "./components/ShoppingTab";
import TabNav from "./components/TabNav";
import { useGoogleDrive } from "./hooks/useGoogleDrive";

export default function App() {
  const [tab, setTab] = useState("pantry");
  const {
    data,
    setData,
    loading,
    saving,
    error,
    signedIn,
    signIn,
    signOut,
    driveEnabled,
    configHint,
    gisReady,
  } = useGoogleDrive();

  if (loading || !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-[var(--color-kitchen-muted)]">
          Warming up the kitchen…
        </p>
      </div>
    );
  }

  const shoppingCount = data.shoppingList.filter((s) => !s.checked).length;

  return (
    <div className="mx-auto min-h-dvh max-w-[760px] px-4 pb-8">
      <header className="border-b border-[var(--color-kitchen-border)] py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-[var(--color-kitchen-amber)]">
              Chef&apos;s Assistant
            </h1>
            <p className="mt-1 text-sm text-[var(--color-kitchen-muted)]">
              Your personal kitchen companion
            </p>
          </div>
          <div className="text-right">
            {driveEnabled ? (
              <>
                {signedIn ? (
                  <button
                    type="button"
                    onClick={signOut}
                    className="text-xs text-[var(--color-kitchen-muted)] hover:text-[var(--color-kitchen-cream)]"
                  >
                    Sign out
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={signIn}
                    disabled={!gisReady}
                    className="rounded-lg border border-[var(--color-kitchen-amber)]/50 px-3 py-1.5 text-xs font-medium text-[var(--color-kitchen-amber)] disabled:opacity-50"
                  >
                    {gisReady ? "Connect Google Drive" : "Loading Google…"}
                  </button>
                )}
                {saving && (
                  <p className="mt-1 text-[10px] text-[var(--color-kitchen-muted)]">
                    Saving…
                  </p>
                )}
              </>
            ) : (
              <p
                className="max-w-[220px] text-[10px] leading-snug text-[var(--color-kitchen-muted)]"
                title={configHint || ""}
              >
                {configHint || "Drive sync off — add Client ID to client/.env"}
              </p>
            )}
          </div>
        </div>
        {error && (
          <p className="mt-3 rounded-lg border border-[var(--color-kitchen-danger)]/30 bg-[var(--color-kitchen-danger)]/10 px-3 py-2 text-xs text-[var(--color-kitchen-danger)]">
            {error}
          </p>
        )}
        {!signedIn && driveEnabled && (
          <div className="mt-2 space-y-1 text-xs text-[var(--color-kitchen-muted)]">
            <p>Sign in to sync pantry, recipes, and history to Google Drive.</p>
            <p>
              If Google blocks sign-in, add this exact origin in Google Cloud →
              Clients → Authorized JavaScript origins:{" "}
              <code className="rounded bg-[var(--color-kitchen-card)] px-1.5 py-0.5 text-[var(--color-kitchen-amber)]">
                {typeof window !== "undefined" ? window.location.origin : ""}
              </code>
            </p>
          </div>
        )}
      </header>

      <TabNav
        active={tab}
        onChange={setTab}
        shoppingCount={shoppingCount}
      />

      <main className="pt-4">
        {tab === "pantry" && <PantryTab data={data} setData={setData} />}
        {tab === "recipes" && (
          <RecipesTab data={data} setData={setData} onTabChange={setTab} />
        )}
        {tab === "shopping" && (
          <ShoppingTab data={data} setData={setData} />
        )}
        {tab === "history" && (
          <HistoryTab data={data} setData={setData} />
        )}
        {tab === "chat" && <ChefChatTab data={data} />}
      </main>
    </div>
  );
}
