import { useCallback, useEffect, useRef, useState } from "react";
import {
  DRIVE_FILE_NAME,
  DRIVE_SCOPE,
  EMPTY_DATA,
  HOUSEHOLD_FILE_ID_KEY,
  PENDING_JOIN_KEY,
  SYNC_INTERVAL_MS,
} from "../utils/constants";
import { STARTER_RECIPES } from "../data/starterRecipes";

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

function mergeWithStarters(data) {
  const recipes = data.recipes?.length ? data.recipes : [];
  const starterIds = new Set(STARTER_RECIPES.map((r) => r.id));
  const userRecipes = recipes.filter((r) => !starterIds.has(r.id));
  const mergedRecipes = [...STARTER_RECIPES, ...userRecipes];
  return {
    pantry: data.pantry || [],
    recipes: mergedRecipes,
    shoppingList: data.shoppingList || [],
    cookHistory: data.cookHistory || [],
    mealPlan: data.mealPlan?.days
      ? data.mealPlan
      : { weekStart: null, days: [null, null, null, null, null, null, null] },
  };
}

function getHouseholdFileId() {
  try {
    return localStorage.getItem(HOUSEHOLD_FILE_ID_KEY);
  } catch {
    return null;
  }
}

function setHouseholdFileId(id) {
  try {
    if (id) localStorage.setItem(HOUSEHOLD_FILE_ID_KEY, id);
    else localStorage.removeItem(HOUSEHOLD_FILE_ID_KEY);
  } catch {
    /* private browsing */
  }
}

function parseJoinInput(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const join = url.searchParams.get("join");
    if (join) return join;
  } catch {
    /* not a URL */
  }
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

function captureJoinFromUrl() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const join = params.get("join");
    if (join) {
      sessionStorage.setItem(PENDING_JOIN_KEY, join);
      const url = new URL(window.location.href);
      url.searchParams.delete("join");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  } catch {
    /* ignore */
  }
}

captureJoinFromUrl();

async function driveRequest(accessToken, path, options = {}) {
  const res = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Drive API error ${res.status}`);
  }
  return res;
}

async function findDataFile(accessToken) {
  const q = encodeURIComponent(
    `name='${DRIVE_FILE_NAME}' and trashed=false`
  );
  const res = await driveRequest(
    accessToken,
    `/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)`
  );
  const { files } = await res.json();
  return files[0] || null;
}

async function getFileMetadata(accessToken, fileId) {
  const res = await driveRequest(
    accessToken,
    `/files/${fileId}?fields=id,name,modifiedTime`
  );
  return res.json();
}

async function downloadFile(accessToken, fileId) {
  const res = await driveRequest(accessToken, `/files/${fileId}?alt=media`);
  const text = await res.text();
  return JSON.parse(text);
}

async function createFile(accessToken, content) {
  const metadata = {
    name: DRIVE_FILE_NAME,
    mimeType: "application/json",
  };
  const boundary = "chefs_assistant_boundary";
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    JSON.stringify(content) +
    `\r\n--${boundary}--`;

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Failed to create Drive file");
  }
  const file = await res.json();
  return file.id;
}

async function updateFile(accessToken, fileId, content) {
  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(content),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Failed to update Drive file");
  }
}

function buildSavePayload(toSave) {
  return {
    pantry: toSave.pantry,
    recipes: toSave.recipes.filter((r) => r.source !== "starter"),
    shoppingList: toSave.shoppingList,
    cookHistory: toSave.cookHistory,
    mealPlan: toSave.mealPlan,
  };
}

function formatOAuthError(response) {
  const desc = response.error_description || "";
  const isOriginMismatch =
    desc.includes("origin_mismatch") ||
    response.error === "origin_mismatch" ||
    desc.toLowerCase().includes("origin");

  if (isOriginMismatch) {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "your app URL";
    return `Google OAuth origin mismatch. In Google Cloud Console → Credentials → your OAuth client → Authorized JavaScript origins, add: ${origin} (and http://localhost:5173 if you use npm run dev).`;
  }
  if (response.error_description) {
    return `${response.error}: ${response.error_description}`;
  }
  if (response.error === "popup_closed_by_user") {
    return "Sign-in was cancelled.";
  }
  return response.error || "Google sign-in failed.";
}

export function useGoogleDrive() {
  const [accessToken, setAccessToken] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [joinError, setJoinError] = useState(null);
  const [signedIn, setSignedIn] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [isSharedKitchen, setIsSharedKitchen] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const tokenClientRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const pendingDataRef = useRef(null);
  const lastModifiedRef = useRef(null);
  const savingRef = useRef(false);
  const fileIdRef = useRef(null);
  const accessTokenRef = useRef(null);

  const applyLoadedFile = useCallback((parsed, id, modifiedTime) => {
    setFileId(id);
    fileIdRef.current = id;
    lastModifiedRef.current = modifiedTime || null;
    setData(mergeWithStarters(parsed));
    setLastSyncedAt(new Date());
    setIsSharedKitchen(Boolean(getHouseholdFileId()));
  }, []);

  const loadFileById = useCallback(async (token, id) => {
    const meta = await getFileMetadata(token, id);
    const parsed = await downloadFile(token, id);
    applyLoadedFile(parsed, id, meta.modifiedTime);
    return id;
  }, [applyLoadedFile]);

  const loadFromDrive = useCallback(
    async (token, options = {}) => {
      const { joinId } = options;
      setLoading(true);
      setError(null);
      setJoinError(null);

      try {
        const householdId = joinId || getHouseholdFileId();

        if (householdId) {
          try {
            await loadFileById(token, householdId);
            setHouseholdFileId(householdId);
            setSignedIn(true);
            return;
          } catch {
            if (joinId) {
              throw new Error(
                "Could not access this kitchen. Ask your partner to share chefs-assistant-data.json with your Google email as Editor in Google Drive, then try again."
              );
            }
            setHouseholdFileId(null);
          }
        }

        const file = await findDataFile(token);
        let parsed;

        if (file) {
          parsed = await downloadFile(token, file.id);
          applyLoadedFile(parsed, file.id, file.modifiedTime);
        } else {
          parsed = { ...EMPTY_DATA, recipes: STARTER_RECIPES };
          const newId = await createFile(token, buildSavePayload(parsed));
          applyLoadedFile(parsed, newId, new Date().toISOString());
        }

        setSignedIn(true);
      } catch (err) {
        if (options.joinId) {
          setJoinError(err.message);
        } else {
          setError(err.message);
        }
        setSignedIn(false);
        setData(mergeWithStarters(EMPTY_DATA));
      } finally {
        setLoading(false);
      }
    },
    [applyLoadedFile, loadFileById]
  );

  const refreshFromDrive = useCallback(async () => {
    const token = accessTokenRef.current;
    const id = fileIdRef.current;
    if (!token || !id || savingRef.current) return;

    setSyncing(true);
    try {
      const meta = await getFileMetadata(token, id);
      if (meta.modifiedTime === lastModifiedRef.current) {
        setLastSyncedAt(new Date());
        return;
      }
      const parsed = await downloadFile(token, id);
      applyLoadedFile(parsed, id, meta.modifiedTime);
      setError(null);
    } catch (err) {
      setError(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }, [applyLoadedFile]);

  useEffect(() => {
    if (!CLIENT_ID) {
      setData(mergeWithStarters(EMPTY_DATA));
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 50;

    const init = () => {
      if (cancelled) return;

      if (!window.google?.accounts?.oauth2) {
        attempts += 1;
        if (attempts >= maxAttempts) {
          setError(
            "Google sign-in script failed to load. Check your network or ad blockers."
          );
          setData(mergeWithStarters(EMPTY_DATA));
          setLoading(false);
          return;
        }
        setTimeout(init, 200);
        return;
      }

      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: async (response) => {
          if (response.error) {
            setError(formatOAuthError(response));
            setLoading(false);
            return;
          }
          setAccessToken(response.access_token);
          accessTokenRef.current = response.access_token;

          let pendingJoin = null;
          try {
            pendingJoin = sessionStorage.getItem(PENDING_JOIN_KEY);
            if (pendingJoin) sessionStorage.removeItem(PENDING_JOIN_KEY);
          } catch {
            /* ignore */
          }

          if (pendingJoin) {
            setHouseholdFileId(pendingJoin);
            await loadFromDrive(response.access_token, { joinId: pendingJoin });
          } else {
            await loadFromDrive(response.access_token);
          }
        },
      });

      setGisReady(true);
      setLoading(false);
      setData(mergeWithStarters(EMPTY_DATA));
      setError(null);
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [loadFromDrive]);

  const signIn = useCallback(() => {
    if (!CLIENT_ID) {
      setError(
        "Add VITE_GOOGLE_CLIENT_ID to client/.env (copy from client/.env.example), then restart npm run dev."
      );
      return;
    }
    if (!tokenClientRef.current) {
      setError("Google sign-in is still loading. Wait a moment and try again.");
      return;
    }
    setLoading(true);
    setError(null);
    tokenClientRef.current.requestAccessToken({ prompt: "" });
  }, []);

  const signOut = useCallback(() => {
    if (accessToken && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(accessToken, () => {});
    }
    setAccessToken(null);
    accessTokenRef.current = null;
    setFileId(null);
    fileIdRef.current = null;
    setSignedIn(false);
    setIsSharedKitchen(false);
    setError(null);
    setJoinError(null);
    setData(mergeWithStarters(EMPTY_DATA));
  }, [accessToken]);

  const joinHousehold = useCallback(
    async (input) => {
      const id = parseJoinInput(input);
      if (!id) {
        setJoinError("Paste a valid invite link or file code.");
        return;
      }

      if (!accessTokenRef.current) {
        try {
          sessionStorage.setItem(PENDING_JOIN_KEY, id);
        } catch {
          /* ignore */
        }
        signIn();
        return;
      }

      setJoinError(null);
      setLoading(true);
      try {
        setHouseholdFileId(id);
        await loadFromDrive(accessTokenRef.current, { joinId: id });
      } catch (err) {
        setHouseholdFileId(null);
        setJoinError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [loadFromDrive, signIn]
  );

  const leaveSharedKitchen = useCallback(async () => {
    setHouseholdFileId(null);
    setIsSharedKitchen(false);
    setJoinError(null);
    if (accessTokenRef.current) {
      await loadFromDrive(accessTokenRef.current);
    }
  }, [loadFromDrive]);

  const updateData = useCallback((updater) => {
    setData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      pendingDataRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!data || !signedIn || !accessToken || !fileId) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      const toSave = pendingDataRef.current || data;
      const payload = buildSavePayload(toSave);

      setSaving(true);
      savingRef.current = true;
      try {
        await updateFile(accessToken, fileId, payload);
        const meta = await getFileMetadata(accessToken, fileId);
        lastModifiedRef.current = meta.modifiedTime;
        setLastSyncedAt(new Date());
        setError(null);
      } catch (err) {
        setError(`Save failed: ${err.message}`);
      } finally {
        setSaving(false);
        savingRef.current = false;
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [data, signedIn, accessToken, fileId]);

  useEffect(() => {
    if (!signedIn || !accessToken || !fileId) return;

    const interval = setInterval(refreshFromDrive, SYNC_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshFromDrive();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [signedIn, accessToken, fileId, refreshFromDrive]);

  return {
    data,
    setData: updateData,
    loading,
    saving,
    syncing,
    error,
    joinError,
    signedIn,
    signIn,
    signOut,
    gisReady,
    driveEnabled: Boolean(CLIENT_ID),
    googleClientId: CLIENT_ID,
    isSharedKitchen,
    householdFileId: fileId,
    joinHousehold,
    leaveSharedKitchen,
    refreshFromDrive,
    lastSyncedAt,
    configHint: !CLIENT_ID
      ? "Create client/.env from client/.env.example (Vite ignores .env.example)."
      : null,
  };
}
