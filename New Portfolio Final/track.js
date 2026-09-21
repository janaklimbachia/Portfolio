// ============================================================
// Lightweight, privacy-respecting visit + interaction logging.
//
// Logs two kinds of rows to Supabase:
//   1. page_views  — one row per page load (path, referrer, device, session)
//   2. events      — one row per interaction: which section someone viewed,
//      which game they opened, whether they guessed right, which project
//      link they clicked, etc. See window.logEvent(name, data) below —
//      script.js calls this at every interaction point already.
//
// No cookies, no third-party trackers, no personal data — just a random
// per-tab session id (not a persistent fingerprint).
//
// If config.js hasn't been filled in yet, everything here quietly no-ops
// so the site still works with zero setup. window.logEvent always exists
// (even unconfigured) so calling it elsewhere never throws.
// ============================================================
(function () {
  function isConfigured() {
    return (
      window.SUPABASE_URL &&
      window.SUPABASE_ANON_KEY &&
      window.SUPABASE_URL.indexOf("YOUR_SUPABASE") !== 0
    );
  }

  function sessionId() {
    var key = "portfolio_session_id";
    var existing = sessionStorage.getItem(key);
    if (existing) return existing;
    var id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, id);
    return id;
  }

  function deviceType() {
    var w = window.innerWidth;
    if (w < 640) return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  }

  function post(table, payload) {
    try {
      fetch(window.SUPABASE_URL + "/rest/v1/" + table, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: window.SUPABASE_ANON_KEY,
          Authorization: "Bearer " + window.SUPABASE_ANON_KEY,
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function () {
        /* fail silently — never let tracking break the site */
      });
    } catch (e) {
      /* fail silently */
    }
  }

  function logVisit() {
    if (!isConfigured()) return;
    post("page_views", {
      path: window.location.pathname,
      referrer: document.referrer || null,
      device: deviceType(),
      session_id: sessionId(),
    });
  }

  // Generic interaction logger. Call from anywhere:
  //   logEvent("guess_movie", {correct: true, title: "Sholay"})
  //   logEvent("view_section", {section: "experience"})
  // event_data must be JSON-serializable. Safe to call even if
  // Supabase isn't configured yet — it just no-ops.
  window.logEvent = function (name, data) {
    if (!isConfigured()) return;
    post("events", {
      path: window.location.pathname,
      session_id: sessionId(),
      event_name: name,
      event_data: data || {},
    });
  };

  if (document.readyState === "complete") {
    logVisit();
  } else {
    window.addEventListener("load", logVisit);
  }
})();
