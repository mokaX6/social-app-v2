// ==========================================
// API HELPER & SESSION (talks to the backend)
// ==========================================
// The frontend is served by the backend, so a relative path is enough
const API_BASE = "/api";

// Sends a request and returns the parsed JSON.
// Throws an Error whose message is safe to show in a toast.
async function api(path, { method = "GET", body, form } = {}) {
  const options = { method, credentials: "same-origin", headers: {} };

  if (form) {
    options.body = form; // the browser sets the multipart header itself
  } else if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(API_BASE + path, options);
  } catch (err) {
    throw new Error("Cannot reach the server");
  }

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    // empty or non-JSON response
  }

  if (!res.ok) {
    // Our API always answers with JSON. Anything else means this address is not the app server
    if (data === null) {
      const wrongServer = new Error(
        `This address is not the app server (HTTP ${res.status}). Start it with npm run dev and open http://127.0.0.1:5000`
      );
      wrongServer.status = res.status;
      throw wrongServer;
    }

    // Validation errors come as a list: show the first one
    const message = (data.errors && data.errors[0]) || data.message || `Request failed (HTTP ${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return data;
}

// Uploads an image (File or Blob) and returns its path, e.g. /uploads/abc.jpg
async function uploadImage(file) {
  const form = new FormData();
  form.append("image", file, file.name || "image.jpg");
  const data = await api("/uploads", { method: "POST", form });
  return data.url;
}

// ------------------------------------------
// Session: who is logged in (null = nobody)
// The login token lives in an httpOnly cookie, so the page asks the server.
// ------------------------------------------
let currentUser = null;
let sessionPromise = null;

function loadSession() {
  if (!sessionPromise) {
    sessionPromise = api("/auth/me")
      .then((data) => {
        currentUser = data.user;
        return currentUser;
      })
      .catch(() => {
        currentUser = null;
        return null;
      });
  }
  return sessionPromise;
}

// Re-reads the session from the server (after login or a profile change)
function refreshSession() {
  sessionPromise = null;
  return loadSession();
}

function setSession(user) {
  currentUser = user;
  sessionPromise = Promise.resolve(user);
}

function isLoggedIn() {
  return currentUser !== null;
}
