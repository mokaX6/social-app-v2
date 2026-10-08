// ==========================================
// AUTH & UI & SIDEBAR MANAGEMENT
// ==========================================
function checkAuthUI() {
  const user = currentUser;

  if (typeof DOM !== 'undefined' && DOM && DOM.openCreatePostBtn) {
    DOM.openCreatePostBtn.style.display = user ? "flex" : "none";
  }
  
  const authContainer = document.getElementById("authButtonsContainer");
  if (!authContainer) return;
  authContainer.style.visibility = "visible"; // hidden in the HTML until we know who is logged in

  if (user) {
    const userAvatar = escapeHtml(user.avatar || DEFAULT_AVATAR);
    const userName = escapeHtml(user.name || user.username || "User");
    
    authContainer.innerHTML = `
      <div class="dropdown user-dropdown-container d-inline-block">
        <button class="user-pill-btn dropdown-toggle d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); padding: 5px 14px 5px 6px; border-radius: 30px; color: #fff; cursor: pointer; transition: all 0.2s;">
          <img src="${userAvatar}" alt="Avatar" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255,255,255,0.2);" />
          <span class="user-pill-name" style="font-size: 13px; font-weight: 500; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${userName}</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end shadow" style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 6px; margin-top: 8px;">
          <li>
            <button class="dropdown-item text-danger d-flex align-items-center gap-2" onclick="logoutFunction()" style="border-radius: 8px; font-size: 13px; padding: 8px 12px; transition: background 0.2s;">
              <i class="fa-solid fa-right-from-bracket"></i> Logout
            </button>
          </li>
        </ul>
      </div>
    `;
  } else {
    authContainer.innerHTML = `
      <button id="loginBtn" class="auth-btn" data-bs-toggle="modal" data-bs-target="#loginModal" title="Login" style="background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
        <i class="fa-solid fa-right-to-bracket"></i> <span class="auth-text">Login</span>
      </button>
      <button id="registerBtn" class="auth-btn register-trigger-btn" data-bs-toggle="modal" data-bs-target="#registerModal" title="Register" style="background: #9333ea; border: none; color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
        <i class="fa-solid fa-user-plus"></i> <span class="auth-text">Register</span>
      </button>
    `;
  }
}

// General protection guard for links or buttons requiring authentication
window.handleProtectedNavigation = function(url, event) {
  if (event) event.preventDefault();
  if (!isLoggedIn()) {
    if (typeof showToast === 'function') {
      showToast("Please login first to access this feature!", "error");
    } else {
      alert("Please login first to access this feature!");
    }
    return;
  }
  window.location.href = url;
};

document.addEventListener("DOMContentLoaded", async () => {
  // Find out who is logged in before drawing the header
  await loadSession();
  checkAuthUI();
  initNativeSidebarIntegration();

  // Protect profile navbar link click if not logged in
  const profileNavLink = document.getElementById("profileNavLink");
  if (profileNavLink) {
    profileNavLink.addEventListener("click", (e) => {
      if (!isLoggedIn()) {
        e.preventDefault();
        showToast("Please login first to access your profile!", "error");
      }
    });
  }

  const registerImageFile = document.getElementById("registerImageFile");
  let selectedRegisterFile = null;

  if (registerImageFile) {
    registerImageFile.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Read and shrink the image now; it is uploaded after the account is created
      try {
        selectedRegisterFile = await imageToBlob(file, 400, 400, 0.7);
      } catch (err) {
        selectedRegisterFile = null;
        registerImageFile.value = "";
        showToast(err.message, "error");
        return;
      }

      const uploadLabel = document.querySelector(".profile-img-upload-label");
      if (uploadLabel) {
        uploadLabel.style.backgroundImage = `url(${URL.createObjectURL(selectedRegisterFile)})`;
        uploadLabel.style.backgroundSize = "cover";
        uploadLabel.style.backgroundPosition = "center";
        uploadLabel.style.borderRadius = "50%";
        uploadLabel.style.overflow = "hidden";
        uploadLabel.style.border = "2px solid #9333ea";
        uploadLabel.innerHTML = "";
      }
    });
  }

  const registerSubmitBtn = document.getElementById("registerSubmitBtn");
  if (registerSubmitBtn) {
    registerSubmitBtn.addEventListener("click", async () => {
      const name = document.getElementById("registerName")?.value.trim() || "";
      const username = document.getElementById("registerUsername")?.value.trim() || "";
      const email = document.getElementById("registerEmail")?.value.trim() || "";
      const password = document.getElementById("registerPassword")?.value.trim() || "";

      if (!name || !username || !email || !password) {
        showToast("Please fill in all fields!", "error");
        return;
      }

      setBusy(registerSubmitBtn, true, "Creating account...");
      try {
        await api("/auth/register", { method: "POST", body: { name, username, email, password } });
        // Registering does not log you in, so do it now (this sets the cookie)
        await api("/auth/login", { method: "POST", body: { username, password } });

        let message = "Registered successfully! Welcome ☕";
        let type = "success";

        // The avatar upload needs a logged-in user, so it happens last
        if (selectedRegisterFile) {
          try {
            const avatar = await uploadImage(selectedRegisterFile);
            await api("/users/me", { method: "PATCH", body: { avatar } });
          } catch (err) {
            message = "Account created, but the avatar was not saved: " + err.message;
            type = "error";
          }
        }

        await refreshSession();
        showToast(message, type);
        safeCloseModal('registerModal');
        checkAuthUI();
        if (typeof fetchingPosts === 'function') await fetchingPosts("", null, { loader: true });
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        setBusy(registerSubmitBtn, false);
      }
    });
  }
});

async function logoutFunction() {
  try {
    await api("/auth/logout", { method: "POST" });
  } catch (err) {
    showToast(err.message, "error");
    return;
  }

  setSession(null);
  showToast("Logged out successfully!", "success");
  checkAuthUI();
  if (typeof fetchingPosts === 'function') await fetchingPosts("", null, { loader: true });
}

window.loginFunction = async function() {
  const usernameValue = document.getElementById("loginUsername")?.value.trim() || "";
  const passwordValue = document.getElementById("loginPassword")?.value.trim() || "";

  if (!usernameValue || !passwordValue) {
    showToast("Please enter username and password!", "error");
    return;
  }

  const loginBtn = document.getElementById("loginSubmitBtn");
  setBusy(loginBtn, true, "Logging in...");
  try {
    await api("/auth/login", { method: "POST", body: { username: usernameValue, password: passwordValue } });
    await refreshSession();
    showToast("Logged in successfully!", "success");
    safeCloseModal('loginModal');
    checkAuthUI();
    if (typeof fetchingPosts === 'function') await fetchingPosts("", typeof state !== 'undefined' ? state.activeTagFilter : null, { loader: true });
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    setBusy(loginBtn, false);
  }
};

function initNativeSidebarIntegration() {
  const sidebarToggle = document.getElementById("sidebarToggle");
  
  const oldMenu = document.getElementById("sidebarMenu");
  if (oldMenu) {
    oldMenu.remove();
  }

  let sidebarOverlay = document.getElementById("customAppSidebarOverlay");
  let sidebarApp = document.getElementById("customAppSidebar");

  // تحديد المسار الصحيح بناءً على مكان الصفحة الحالية (سواء الرئيسية أو داخل ساشين الإعدادات)
  const isInsideFolder = window.location.pathname.includes('/sittings/') || window.location.pathname.includes('/profile/');
  const homePath = isInsideFolder ? "../index.html" : "index.html";
  const profilePath = isInsideFolder ? "../profile/profile.html" : "profile/profile.html";
  const settingsPath = isInsideFolder ? "sittings.html" : "sittings/sittings.html";

  if (!sidebarOverlay) {
    const sidebarHTML = `
      <div id="customAppSidebarOverlay"></div>
      <div id="customAppSidebar">
        <div class="sidebar-header">
          <div class="sidebar-brand" style="cursor: default;">
            <div class="brand-icon-glow"><i class="fa-solid fa-mug-hot"></i></div>
            <h4>Moka Menu</h4>
          </div>
          <button id="closeSidebarBtn"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="sidebar-links-container">
          <a href="${homePath}" class="sidebar-link-item">
            <div class="link-icon-wrapper"><i class="fa-solid fa-house"></i></div>
            <span>Home Feed</span>
            <i class="fa-solid fa-chevron-right arrow-icon"></i>
          </a>
          <div class="sidebar-divider"></div>
          <a href="#" onclick="handleProtectedNavigation('${profilePath}', event)" class="sidebar-link-item">
            <div class="link-icon-wrapper"><i class="fa-solid fa-user"></i></div>
            <span>My Profile</span>
            <i class="fa-solid fa-chevron-right arrow-icon"></i>
          </a>
          <div class="sidebar-divider"></div>
          <a href="${settingsPath}" onclick="if(window.location.href.includes('sittings.html')) { event.preventDefault(); window.location.reload(); }" class="sidebar-link-item">
            <div class="link-icon-wrapper"><i class="fa-solid fa-gear"></i></div>
            <span>Settings</span>
            <i class="fa-solid fa-chevron-right arrow-icon"></i>
          </a>
        </div>
        <div class="sidebar-footer">
          <p>Moka Cafe Social v2.5</p>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', sidebarHTML);
    sidebarOverlay = document.getElementById("customAppSidebarOverlay");
    sidebarApp = document.getElementById("customAppSidebar");
  }

  const closeSidebarBtn = document.getElementById("closeSidebarBtn");

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!isLoggedIn()) {
        if (typeof showToast === 'function') {
          showToast("Please login first to access the menu!", "error");
        } else {
          alert("Please login first to access the menu!");
        }
        return;
      }
      
      if (sidebarApp && sidebarOverlay) {
        sidebarApp.classList.add("open");
        sidebarOverlay.classList.add("show");
        document.body.style.overflow = "hidden";
      }
    });
  }

  const closeSidebar = () => {
    if (sidebarApp && sidebarOverlay) {
      sidebarApp.classList.remove("open");
      sidebarOverlay.classList.remove("show");
      document.body.style.overflow = "auto";
    }
  };

  if (closeSidebarBtn) closeSidebarBtn.addEventListener("click", closeSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);

  console.log("Native sidebar slide-in integration activated successfully.");
}
