import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { auth, login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const autoLoginArmedRef = useRef(false);
  const manualTypingRef = useRef(false);
  const lastAutoAttemptRef = useRef("");
  const wasLoggedInRef = useRef(false);
  const pollRef = useRef(null);
  const loadingRef = useRef(false);
  const clearAutofillIntervalRef = useRef(null);
  const hasFocusedRef = useRef(false);

  const clearForm = useMemo(
    () => () => {
      if (usernameRef.current) usernameRef.current.value = "";
      if (passwordRef.current) passwordRef.current.value = "";
    },
    []
  );

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const stopAutofillClear = () => {
    if (clearAutofillIntervalRef.current) {
      clearInterval(clearAutofillIntervalRef.current);
      clearAutofillIntervalRef.current = null;
    }
  };

  const startAutofillClearUntilFocus = () => {
    stopAutofillClear();
    const start = Date.now();
    clearAutofillIntervalRef.current = setInterval(() => {
      if (hasFocusedRef.current) {
        stopAutofillClear();
        return;
      }

      // Keep fields empty until the user focuses the username.
      clearForm();

      // Safety stop.
      if (Date.now() - start > 2000) {
        stopAutofillClear();
      }
    }, 100);
  };

  const startAutoLoginPoll = () => {
    stopPoll();
    const start = Date.now();

    pollRef.current = setInterval(() => {
      const username = (usernameRef.current?.value || "").trim();
      const password = (passwordRef.current?.value || "").trim();

      if (Date.now() - start > 2500) {
        stopPoll();
        return;
      }

      if (!autoLoginArmedRef.current) return;
      if (manualTypingRef.current) return;
      if (auth?.user) return;
      if (loadingRef.current) return;
      if (!username || !password) return;

      const key = `${username}::${password}`;
      if (lastAutoAttemptRef.current === key) return;
      lastAutoAttemptRef.current = key;

      autoLoginArmedRef.current = false;
      stopPoll();
      doLogin(username, password);
    }, 120);
  };

  const maybeArmAutoLoginFromEvent = (e) => {
    const inputType = e?.nativeEvent?.inputType;
    // We only auto-login for browser-driven selection/autofill.
    // Manual typing should never trigger auto-login.
    const isBrowserFill =
      inputType === 'insertReplacementText' ||
      inputType === 'insertFromAutoFill' ||
      inputType === 'insertFromAutocomplete';

    if (isBrowserFill) {
      manualTypingRef.current = false;
      autoLoginArmedRef.current = true;
      // allow retry if user selected same account again
      lastAutoAttemptRef.current = "";
      startAutoLoginPoll();
    }
  };
  // if (user.role === "admin") navigate("/dashboard");
  // else if (user.role === "student") navigate("/student-dashboard");
  // else navigate("/dashboard");
  
  // Redirect after successful login
  useEffect(() => {
    if (!auth?.user) return;

    const role = auth.user.role;
    switch (role) {
      case "admin":
        navigate("/dashboard", { replace: true });
        break;
      case "staff":
        navigate("/dashboard", { replace: true });
        break;
      case "teacher":
        navigate("/grades", { replace: true });
        break;
      case "student":
        navigate("/student-dashboard", { replace: true });
        break;
      default:
        navigate("/", { replace: true });
    }
  }, [auth?.user, navigate]);

  // Keep login inputs empty by default. Browser-saved logins will appear on focus.
  useEffect(() => {
    clearForm();
    hasFocusedRef.current = false;
    // Some browsers try to autofill after a delay; keep clearing until focus.
    requestAnimationFrame(() => clearForm());
    setTimeout(() => clearForm(), 0);
    startAutofillClearUntilFocus();
    return () => stopAutofillClear();
  }, [clearForm]);

  // After logout, reset inputs back to "clean until focus".
  useEffect(() => {
    const loggedIn = !!auth?.user;
    if (wasLoggedInRef.current && !loggedIn) {
      clearForm();
      hasFocusedRef.current = false;
      autoLoginArmedRef.current = false;
      manualTypingRef.current = false;
      lastAutoAttemptRef.current = "";
      stopPoll();
      startAutofillClearUntilFocus();
    }
    wasLoggedInRef.current = loggedIn;
  }, [auth?.user, clearForm]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const handleInput = (e) => {
    // If the user is typing manually, never auto-login.
    // If browser autocomplete is used, arm auto-login.
    maybeArmAutoLoginFromEvent(e);

    // Fallback: many browsers won't set inputType reliably.
    // If the value changed without keyboard typing, treat it as a saved-account selection.
    const name = e?.target?.name;
    const value = String(e?.target?.value || "").trim();
    if (name === "username" && value && !manualTypingRef.current) {
      autoLoginArmedRef.current = true;
      lastAutoAttemptRef.current = "";
      startAutoLoginPoll();

      // Some browsers fill password only after password field is focused.
      const domPass = (passwordRef.current?.value || "").trim();
      if (!domPass) {
        setTimeout(() => passwordRef.current?.focus(), 0);
      }
    }
  };


const doLogin = async (username, password) => {
  if (!username || !password) return;
  if (loadingRef.current) return;
  setLoading(true);
  try {
    const result = await login(username, password);
    if (!result?.success) {
      toast.error(result?.message || "Invalid credentials.");
    }
  } finally {
    setLoading(false);
  }
};

const handleSubmit = async (e) => {
  e.preventDefault();
  const username = (usernameRef.current?.value || "").trim();
  const password = (passwordRef.current?.value || "").trim();
  await doLogin(username, password);
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center px-6 py-10">
      <div className="relative w-full max-w-4xl rounded-2xl p-2">
        <div className="relative flex flex-col justify-center rounded-2xl bg-white/70 px-6 py-16 backdrop-blur-md shadow-xl">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-10">
              <h1 className="text-4xl font-extrabold uppercase text-gray-800">
                Sign in
              </h1>
              <p className="text-base font-bold leading-normal text-gray-500">
                Enter your username and password to log in.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} autoComplete="on">
              <input
                ref={usernameRef}
                name="username"
                type="text"
                placeholder="Username or Email"
                required
                onInput={handleInput}
                onChange={handleInput}
                onFocus={() => {
                  // Show saved accounts dropdown when focused.
                  // Do NOT auto-login on focus; only after selecting a saved account.
                  hasFocusedRef.current = true;
                  stopAutofillClear();
                  manualTypingRef.current = false;
                }}
                onKeyDown={() => {
                  // Manual typing disables auto-login.
                  manualTypingRef.current = true;
                  autoLoginArmedRef.current = false;
                  stopPoll();
                }}
                autoComplete="username"
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-600"
              />

              <input
                ref={passwordRef}
                name="password"
                type="password"
                placeholder="Password"
                required
                onInput={handleInput}
                onChange={handleInput}
                onFocus={() => {
                  manualTypingRef.current = false;
                }}
                onKeyDown={() => {
                  manualTypingRef.current = true;
                  autoLoginArmedRef.current = false;
                  stopPoll();
                }}
                autoComplete="current-password"
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-600"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-800 text-white font-semibold py-3 rounded-lg hover:bg-gray-700 transition duration-200"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}