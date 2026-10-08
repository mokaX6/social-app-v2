// ==========================================
// 1. DOM ELEMENTS CACHE & STATE & UTILS
// ==========================================
const DOM = {
  postsContainer: document.getElementById("postsContainer"),
  navLinksContainer: document.querySelector(".nav-links"),
  loadingSpinner: document.getElementById("loadingSpinner"),
  searchInput: document.querySelector(".search-box input"),
  
  // Register Form
  registerName: document.getElementById("registerName"),
  registerEmail: document.getElementById("registerEmail"),
  registerUsername: document.getElementById("registerUsername"),
  registerPassword: document.getElementById("registerPassword"),
  registerImageFile: document.getElementById("registerImageFile"),
  registerSubmitBtn: document.getElementById("registerSubmitBtn"),

  // Login Form
  loginUsername: document.getElementById("loginUsername"),
  loginPassword: document.getElementById("loginPassword"),
  loginSubmitBtn: document.getElementById("loginSubmitBtn"),

  // Create Post Modal
  openCreatePostBtn: document.getElementById("openCreatePostModal"),
  createPostModal: document.getElementById("createPostModal"),
  closeCreateModalBtn: document.getElementById("closeCreateModal"),
  postTitleInput: document.getElementById("postTitleInput"),
  postDescInput: document.getElementById("postDescInput"),
  postTagsInput: document.getElementById("postTagsInput"),
  postMediaFile: document.getElementById("postMediaFile"),
  publishPostBtn: document.querySelector(".publish-btn"),
  
  // Toast
  toast: document.getElementById("toastNotification"),
  toastMessage: document.getElementById("toastMessage"),
  toastIcon: document.getElementById("toastIcon")
};

let state = {
  selectedPostFile: null, // image chosen for a new post (uploaded when publishing)
  activeTagFilter: null
};

// Shown when a user has no avatar (inline image, no external service needed)
const DEFAULT_AVATAR = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#3f3f46"/><circle cx="32" cy="24" r="12" fill="#a1a1aa"/><path d="M8 64c2-16 14-24 24-24s22 8 24 24z" fill="#a1a1aa"/></svg>'
);

// Escapes text before it is placed inside innerHTML (stops XSS)
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Loading Helpers
function showLoader() {
  if (DOM.loadingSpinner) DOM.loadingSpinner.style.display = "flex";
}

function hideLoader() {
  if (DOM.loadingSpinner) DOM.loadingSpinner.style.display = "none";
}

// Disables a button and shows a spinner on it while a request is running
function setBusy(button, busy, text = "Please wait...") {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.innerHTML;
    button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${text}`;
    button.disabled = true;
  } else {
    if (button.dataset.label !== undefined) button.innerHTML = button.dataset.label;
    button.disabled = false;
  }
}

// Image Compressor Utility
function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.65) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        } else {
          if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

// Reads an image right away and returns a Blob ready for upload (kept in memory).
// Call it as soon as the user picks the file: on phones the picked file can become unreadable later.
async function imageToBlob(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
  let buffer;
  try {
    buffer = await file.arrayBuffer();
  } catch (err) {
    throw new Error("Could not read this file. Please pick the photo again");
  }

  const type = file.type || "image/jpeg";
  const original = new Blob([buffer], { type });

  // GIFs are kept as they are so the animation is not lost
  if (type === "image/gif") return original;

  try {
    return await shrinkImage(original, maxWidth, maxHeight, quality);
  } catch (err) {
    // Shrinking is only an optimization: use the original if the server accepts it (2MB max)
    if (/^image\/(jpeg|png|webp)$/.test(type) && original.size <= 2 * 1024 * 1024) return original;
    throw new Error("This image could not be processed. Try a different photo");
  }
}

// Draws the image smaller on a canvas and returns it as a JPEG Blob
function shrinkImage(blob, maxWidth, maxHeight, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, maxWidth / img.width, maxHeight / img.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff"; // transparent PNGs would turn black as JPEG
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("Image conversion failed"))),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image could not be decoded"));
    };
    img.src = url;
  });
}

// Safe Modal Closer
function safeCloseModal(modalId) {
  const modalElement = document.getElementById(modalId);
  if (modalElement) {
    const modalInstance = window.bootstrap?.Modal?.getInstance(modalElement) || new window.bootstrap.Modal(modalElement);
    modalInstance.hide();
  }
  setTimeout(() => {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = 'auto';
    document.body.style.paddingRight = '';
  }, 200);
}

// Toast Notification
function showToast(message, type = "success") {
  if (!DOM.toast) return;
  DOM.toastMessage.textContent = message;
  DOM.toastIcon.className = type === "success" ? "fa-solid fa-circle-check" : "fa-solid fa-circle-xmark";
  DOM.toast.style.borderColor = type === "success" ? "#28a745" : "#dc3545";
  DOM.toast.classList.add("show");
  setTimeout(() => DOM.toast.classList.remove("show"), 3000);
}
