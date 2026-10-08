// ==========================================
// SCRIPT: MAIN APPLICATION LOGIC & SPLASH INIT
// ==========================================

// Turns "coffee, #social" into ["coffee", "social"]
function parseTags(rawTags) {
  return rawTags
    ? rawTags.split(",").map(t => t.trim().replace("#", "")).filter(t => t.length > 0)
    : [];
}

document.addEventListener("DOMContentLoaded", async () => {
  // 1. التعامل مع عرض شاشة الـ Splash (مرة كل 24 ساعة ولمدة 3 ثواني)
  const splash = document.getElementById("startupSplash");
  const lastSplashTime = localStorage.getItem("mokaSplashTimestamp");
  const currentTime = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  if (!lastSplashTime || (currentTime - Number(lastSplashTime)) > twentyFourHours) {
    if (splash) splash.style.display = "flex";
    setTimeout(() => {
      if (splash) {
        splash.style.opacity = "0";
        splash.style.visibility = "hidden";
        setTimeout(() => splash.remove(), 500);
      }
      localStorage.setItem("mokaSplashTimestamp", currentTime.toString());
    }, 3000);
  } else {
    if (splash) splash.remove();
  }

  // 2. تفعيل العمليات الأساسية للتطبيق
  // (the header and sidebar are drawn by Auth.js once the session is known)
  initEventListeners();
  initLightboxModal();
  initCommentsModal();
  initSearchFeature();

  showLoader();
  await loadSession();
  try {
    await fetchingPosts();
  } finally {
    hideLoader();
  }
});

function initSearchFeature() {
  const searchInput = (typeof DOM !== 'undefined' && DOM.searchInput) ? DOM.searchInput : document.getElementById("searchInput");
  if (!searchInput) return;

  searchInput.addEventListener("focus", (e) => {
    if (!isLoggedIn()) {
      e.target.blur();
      showToast("Please login first to use search!", "error");
    }
  });

  // Wait until the user stops typing so we do not send a request per keystroke
  let searchTimer;
  searchInput.addEventListener("input", (e) => {
    if (!isLoggedIn()) {
      e.target.value = "";
      showToast("Please login first to use search!", "error");
      return;
    }
    clearTimeout(searchTimer);
    const value = e.target.value;
    searchTimer = setTimeout(() => fetchingPosts(value, state.activeTagFilter), 350);
  });
}

function initEventListeners() {
  const openCreatePostBtn = document.getElementById("openCreatePostModal") || (typeof DOM !== 'undefined' && DOM.openCreatePostBtn);
  const createPostModal = document.getElementById("createPostModal") || (typeof DOM !== 'undefined' && DOM.createPostModal);
  const closeCreateModalBtn = document.getElementById("closeCreateModalBtn") || (typeof DOM !== 'undefined' && DOM.closeCreateModalBtn);

  if (openCreatePostBtn) {
    openCreatePostBtn.addEventListener("click", () => {
      if (!isLoggedIn()) {
        showToast("Please login first to create a post!", "error");
        return;
      }
      if (createPostModal) {
        createPostModal.style.display = "flex";
      }
    });
  }

  const closeCreatePostAction = () => {
    if (createPostModal) createPostModal.style.display = "none";
  };

  if (closeCreateModalBtn) closeCreateModalBtn.addEventListener("click", closeCreatePostAction);
  window.addEventListener("click", (e) => {
    if (createPostModal && e.target === createPostModal) closeCreatePostAction();
  });

  const editPostModal = document.getElementById("editPostModal");
  const closeEditModalBtn = document.getElementById("closeEditModalBtn");
  const closeEditAction = () => { if (editPostModal) editPostModal.style.display = "none"; };
  if (closeEditModalBtn) closeEditModalBtn.addEventListener("click", closeEditAction);
  window.addEventListener("click", (e) => { if (editPostModal && e.target === editPostModal) closeEditAction(); });

  const updatePostBtn = document.getElementById("updatePostBtn");
  if (updatePostBtn) {
    updatePostBtn.addEventListener("click", async () => {
      const postId = document.getElementById("editPostIdInput")?.value;
      const title = document.getElementById("editPostTitleInput")?.value.trim();
      const body = document.getElementById("editPostDescInput")?.value.trim();
      const rawTags = document.getElementById("editPostTagsInput")?.value.trim();

      if (!title || !body) {
        showToast("Please provide title and description", "error");
        return;
      }

      setBusy(updatePostBtn, true, "Saving...");
      try {
        await api(`/posts/${encodeURIComponent(postId)}`, {
          method: "PATCH",
          body: { title, text: body, tags: parseTags(rawTags) }
        });
        showToast("Post updated successfully!", "success");
        closeEditAction();
        await fetchingPosts(typeof DOM !== 'undefined' && DOM.searchInput ? DOM.searchInput.value : "", state.activeTagFilter, { loader: true });
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        setBusy(updatePostBtn, false);
      }
    });
  }

  const postMediaFile = document.getElementById("postMediaFile") || (typeof DOM !== 'undefined' && DOM.postMediaFile);
  if (postMediaFile) {
    postMediaFile.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Read and shrink the image now; it is uploaded when the post is published
      try {
        state.selectedPostFile = await imageToBlob(file, 900, 900, 0.7);
      } catch (err) {
        state.selectedPostFile = null;
        postMediaFile.value = "";
        showToast(err.message, "error");
        return;
      }

      let previewContainer = document.getElementById("postMediaPreview");
      if (!previewContainer) {
        previewContainer = document.createElement("div");
        previewContainer.id = "postMediaPreview";
        previewContainer.style.cssText = "margin-top: 10px; position: relative; max-height: 150px; overflow: hidden; border-radius: 8px;";
        postMediaFile.insertAdjacentElement("afterend", previewContainer);
      }

      previewContainer.innerHTML = `
        <img src="${URL.createObjectURL(state.selectedPostFile)}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;" />
        <span style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.6); color: white; padding: 2px 6px; font-size: 10px; border-radius: 4px;">Attached ✓</span>
      `;
    });
  }

  const publishPostBtn = document.getElementById("publishPostBtn") || (typeof DOM !== 'undefined' && DOM.publishPostBtn);
  if (publishPostBtn) {
    publishPostBtn.addEventListener("click", async () => {
      if (!isLoggedIn()) {
        showToast("Please login first to publish posts!", "error");
        return;
      }

      const postTitleInput = document.getElementById("postTitleInput") || (typeof DOM !== 'undefined' && DOM.postTitleInput);
      const postDescInput = document.getElementById("postDescInput") || (typeof DOM !== 'undefined' && DOM.postDescInput);
      const postTagsInput = document.getElementById("postTagsInput") || (typeof DOM !== 'undefined' && DOM.postTagsInput);

      const title = postTitleInput?.value.trim() || "";
      const body = postDescInput?.value.trim().replace(/\r\n/g, '\n') || "";
      const rawTags = postTagsInput ? postTagsInput.value.trim() : "";

      if (!title || !body) {
        showToast("Please provide both a title and description!", "error");
        return;
      }

      setBusy(publishPostBtn, true, "Publishing...");

      try {
        const payload = { title, text: body, tags: parseTags(rawTags) };

        // Upload the image first, then send its path with the post
        if (state.selectedPostFile) {
          payload.image = await uploadImage(state.selectedPostFile);
        }

        await api("/posts", { method: "POST", body: payload });

        showToast("Post published successfully! 🚀", "success");

        if (postTitleInput) postTitleInput.value = "";
        if (postDescInput) postDescInput.value = "";
        if (postTagsInput) postTagsInput.value = "";
        state.selectedPostFile = null;
        if (postMediaFile) postMediaFile.value = "";

        const previewContainer = document.getElementById("postMediaPreview");
        if (previewContainer) previewContainer.remove();

        closeCreatePostAction();
        await fetchingPosts("", state.activeTagFilter, { loader: true });
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        setBusy(publishPostBtn, false);
      }
    });
  }
}
