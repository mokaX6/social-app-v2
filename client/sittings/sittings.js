// Toast Notification helper
function showToast(message, type = "success") {
  let toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    toastContainer.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;";
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement("div");
  toast.style.cssText = `background: ${type === 'error' ? '#ef4444' : '#10b981'}; color: white; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: opacity 0.3s;`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

let activeEditField = null;
// The current password, kept in memory only between the two password steps
let verifiedCurrentPassword = null;

document.addEventListener("DOMContentLoaded", async () => {
  await loadSession();
  if (!isLoggedIn()) {
    alert("Please login first to access settings!");
    window.location.href = "../index.html";
    return;
  }
  loadSettingsData();

  // Show the page only when your data and your picture are ready
  await new Promise((resolve) => {
    const img = document.getElementById("settingsAvatarImg");
    if (img.complete) return resolve();
    img.addEventListener("load", () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
    setTimeout(resolve, 5000);
  });
  hideLoader();

  // Avatar file change listener
  const avatarFileInput = document.getElementById("avatarFileInput");
  if (avatarFileInput) {
    avatarFileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      showLoader();
      try {
        const blob = await imageToBlob(file, 400, 400, 0.7);
        const avatar = await uploadImage(blob);
        await api("/users/me", { method: "PATCH", body: { avatar } });
        await refreshSession();

        loadSettingsData();
        showToast("Profile picture updated successfully! 🖼️", "success");
        if (typeof checkAuthUI === 'function') checkAuthUI();
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        hideLoader();
      }
      avatarFileInput.value = "";
    });
  }
});

function loadSettingsData() {
  document.getElementById("settingsAvatarImg").src = currentUser.avatar || DEFAULT_AVATAR;
  document.getElementById("settingsDisplayName").textContent = currentUser.name || currentUser.username || "User";
  
  const usernameValElem = document.getElementById("settingsUsernameVal");
  if (usernameValElem) usernameValElem.textContent = "@" + (currentUser.username || "");

  const bioValElem = document.getElementById("settingsBioVal");
  if (currentUser.bio) {
    bioValElem.textContent = currentUser.bio;
    bioValElem.classList.remove("text-muted");
  } else {
    bioValElem.textContent = "No bio added yet.";
    bioValElem.classList.add("text-muted");
  }

  const emailValElem = document.getElementById("settingsEmailVal");
  if (currentUser.email) {
    emailValElem.textContent = currentUser.email;
    emailValElem.classList.remove("text-muted");
  } else {
    emailValElem.textContent = "No email added";
    emailValElem.classList.add("text-muted");
  }
}

// Modal Field Editing Handlers
function openEditFieldModal(fieldKey, fieldLabel) {
  activeEditField = fieldKey;

  document.getElementById("editModalTitle").textContent = "Edit " + fieldLabel;
  const inputElem = document.getElementById("editFieldInput");
  
  if (fieldKey === 'name') inputElem.value = currentUser.name || "";
  else if (fieldKey === 'username') inputElem.value = currentUser.username || "";
  else if (fieldKey === 'bio') inputElem.value = currentUser.bio || "";
  else if (fieldKey === 'email') inputElem.value = currentUser.email || "";

  document.getElementById("editFieldModal").style.display = "flex";
}

function closeEditFieldModal() {
  document.getElementById("editFieldModal").style.display = "none";
  activeEditField = null;
}

async function saveFieldChanges() {
  const field = activeEditField;
  const newValue = document.getElementById("editFieldInput").value.trim();

  // Only the bio may be empty
  if (!newValue && field !== 'bio') {
    showToast("Field cannot be empty!", "error");
    return;
  }

  showLoader();
  try {
    await api("/users/me", { method: "PATCH", body: { [field]: newValue } });
    await refreshSession();

    loadSettingsData();
    if (typeof checkAuthUI === 'function') checkAuthUI();

    closeEditFieldModal();
    showToast("Updated successfully! ✨", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    hideLoader();
  }
}

// Password Verification Flow
function openPasswordVerificationModal() {
  document.getElementById("verifyCurrentPasswordInput").value = "";
  document.getElementById("passwordVerifyModal").style.display = "flex";
}

function closeVerifyModal() {
  document.getElementById("passwordVerifyModal").style.display = "none";
}

async function verifyPasswordAction() {
  const enteredPassword = document.getElementById("verifyCurrentPasswordInput").value;
  if (!enteredPassword) {
    showToast("Please enter your current password!", "error");
    return;
  }

  showLoader();
  try {
    // Logging in again is how the server checks the password
    await api("/auth/login", {
      method: "POST",
      body: { username: currentUser.username, password: enteredPassword }
    });

    verifiedCurrentPassword = enteredPassword;
    closeVerifyModal();
    document.getElementById("newPasswordInputBox").value = "";
    document.getElementById("passwordChangeModal").style.display = "flex";
  } catch (err) {
    showToast(err.status === 401 ? "Incorrect password! Please try again." : err.message, "error");
  } finally {
    hideLoader();
  }
}

function closePasswordChangeModal() {
  document.getElementById("passwordChangeModal").style.display = "none";
  verifiedCurrentPassword = null;
}

async function saveNewPasswordAction() {
  const newPassword = document.getElementById("newPasswordInputBox").value.trim();
  if (!newPassword) {
    showToast("Please enter a new password!", "error");
    return;
  }

  showLoader();
  try {
    await api("/users/me/password", {
      method: "PATCH",
      body: { currentPassword: verifiedCurrentPassword, newPassword }
    });

    closePasswordChangeModal();
    showToast("Password updated successfully! 🔒", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    hideLoader();
  }
}
