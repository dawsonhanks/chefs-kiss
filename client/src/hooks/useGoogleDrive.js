import { useCallback, useEffect, useRef, useState } from "react";
import { DRIVE_FILE_NAME, DRIVE_SCOPE, EMPTY_DATA } from "../utils/constants";
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
  };
}

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
    `/files?q=${q}&spaces=drive&fields=files(id,name)`
  );
  const { files } = await res.json();
  return files[0] || null;
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
  const [error, setError] = useState(null);
  const [signedIn, setSignedIn] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const tokenClientRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const pendingDataRef = useRef(null);

  const loadFromDrive = useCallback(async (token) => {
    setLoading(true);
    setError(null);
    try {
      const file = await findDataFile(token);
      let parsed;

      if (file) {
        parsed = await downloadFile(token, file.id);
        setFileId(file.id);
      } else {
        parsed = { ...EMPTY_DATA, recipes: STARTER_RECIPES };
        const newId = await createFile(token, parsed);
        setFileId(newId);
      }

      setData(mergeWithStarters(parsed));
      setSignedIn(true);
    } catch (err) {
      setError(err.message);
      setSignedIn(false);
      setData(mergeWithStarters(EMPTY_DATA));
    } finally {
      setLoading(false);
    }
  }, []);

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
          await loadFromDrive(response.access_token);
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
    setFileId(null);
    setSignedIn(false);
    setError(null);
    setData(mergeWithStarters(EMPTY_DATA));
  }, [accessToken]);

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
      const payload = {
        pantry: toSave.pantry,
        recipes: toSave.recipes.filter((r) => r.source !== "starter"),
        shoppingList: toSave.shoppingList,
        cookHistory: toSave.cookHistory,
      };

      setSaving(true);
      try {
        await updateFile(accessToken, fileId, payload);
        setError(null);
      } catch (err) {
        setError(`Save failed: ${err.message}`);
      } finally {
        setSaving(false);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [data, signedIn, accessToken, fileId]);

  return {
    data,
    setData: updateData,
    loading,
    saving,
    error,
    signedIn,
    signIn,
    signOut,
    gisReady,
    driveEnabled: Boolean(CLIENT_ID),
    configHint: !CLIENT_ID
      ? "Create client/.env from client/.env.example (Vite ignores .env.example)."
      : null,
  };
}
