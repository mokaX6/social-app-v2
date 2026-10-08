// ==========================================
// SCRIPT: POSTS MANAGEMENT (FETCH, EDIT, DELETE, INTERACTIONS)
// ==========================================

// Posts currently shown in the feed (used by edit and share)
let loadedPosts = [];
// Ids of the posts the logged-in user saved, and whose list this is
let savedIds = new Set();
let savedIdsOwner = null;
// Fast typing sends several requests: only the newest one may draw the feed
let latestFeedRequest = 0;

function getRelativeTime(timestamp) {
  if (!timestamp) return "Just now";
  const elapsedSeconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);

  if (elapsedSeconds < 60) {
    return "Just now";
  } else if (elapsedSeconds < 3600) {
    const minutes = Math.floor(elapsedSeconds / 60);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  } else if (elapsedSeconds < 86400) {
    const hours = Math.floor(elapsedSeconds / 3600);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  } else {
    const days = Math.floor(elapsedSeconds / 86400);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
}

// Helper function to navigate to user profile with auth check
window.goToUserProfile = function(username) {
  if (!isLoggedIn()) {
    showToast("Please login first to view user profile!", "error");
    return;
  }
  if (!username) return;
  window.location.href = `profile/profile.html?username=${encodeURIComponent(username)}`;
};

// Loads which posts the user saved (once per logged-in user)
async function loadSavedIds() {
  const owner = currentUser ? currentUser._id : null;
  if (owner === savedIdsOwner) return;

  savedIds = new Set();
  if (owner) {
    const data = await api("/posts/saved");
    savedIds = new Set(data.posts.map((p) => p._id));
  }
  savedIdsOwner = owner;
}

// Loads the feed. With { loader: true } the feed is emptied and the loading card is shown meanwhile
async function fetchingPosts(filterQuery = "", tagFilter = null, { loader = false } = {}) {
  if (!loader) return loadFeed(filterQuery, tagFilter);

  const container = (typeof DOM !== 'undefined' && DOM.postsContainer) || document.getElementById("postsContainer");
  if (container) container.innerHTML = "";
  showLoader();
  try {
    await loadFeed(filterQuery, tagFilter);
  } finally {
    hideLoader();
  }
}

async function loadFeed(filterQuery, tagFilter) {
  const requestId = ++latestFeedRequest;
  const searchTerm = filterQuery.trim().replace("#", "");

  const params = new URLSearchParams({ limit: "50" });
  if (searchTerm) params.set("search", searchTerm);
  if (tagFilter) params.set("tag", tagFilter);

  let posts;
  let matchedUsers = [];
  try {
    const requests = [api(`/posts?${params}`)];
    if (searchTerm) requests.push(api(`/users?search=${encodeURIComponent(searchTerm)}`));

    const [postsData, usersData] = await Promise.all(requests);
    posts = postsData.posts;
    if (usersData) matchedUsers = usersData.users;

    // The feed still works if the saved list fails to load
    await loadSavedIds().catch(() => {});
  } catch (err) {
    if (requestId === latestFeedRequest) showToast(err.message, "error");
    return;
  }

  // A newer request started while this one was loading
  if (requestId !== latestFeedRequest) return;

  loadedPosts = posts;
  const matchingPosts = posts;

  let allPostsHTML = "";

  // Render matched users section if searching by user name/username
  if (searchTerm && matchedUsers.length > 0) {
    allPostsHTML += `<div class="users-search-results mb-3" style="display: flex; flex-direction: column; gap: 10px;">`;
    allPostsHTML += `<h6 style="color: #a855f7; font-size: 13px; margin-bottom: 5px;">Users Found:</h6>`;
    matchedUsers.forEach(u => {
      const uAvatar = escapeHtml(u.avatar || DEFAULT_AVATAR);
      const uName = escapeHtml(u.name || "User");
      const uUsername = escapeHtml(u.username || "");
      allPostsHTML += `
        <div class="user-search-card" data-username="${uUsername}" onclick="goToUserProfile(this.dataset.username)" style="display: flex; align-items: center; gap: 12px; background: rgba(25, 20, 45, 0.8); border: 1px solid rgba(147, 51, 234, 0.2); padding: 10px 14px; border-radius: 12px; cursor: pointer; transition: all 0.2s;">
          <img src="${uAvatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" />
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 600; font-size: 14px; color: #fff;">${uName}</span>
            <span style="font-size: 12px; color: #a1a1aa;">@${uUsername}</span>
          </div>
        </div>
      `;
    });
    allPostsHTML += `</div>`;
  }

  if (matchingPosts.length === 0 && matchedUsers.length === 0) {
    const emptyText = (searchTerm || tagFilter) ? "No results found." : "No posts yet. Be the first to post!";
    allPostsHTML += `
      <div class="text-center text-muted py-5">
        <p>${emptyText}</p>
        ${tagFilter ? `<button class="btn btn-sm btn-outline-primary mt-2" onclick="clearTagFilter()">Show All Posts</button>` : ""}
      </div>`;
  } else {
    if (tagFilter) {
      allPostsHTML += `
        <div class="alert alert-secondary d-flex justify-content-between align-items-center mb-3 py-2 px-3" style="font-size: 13px; border-radius: 8px;">
          <span>Filtering by tag: <b>#${escapeHtml(tagFilter)}</b></span>
          <button class="btn btn-sm btn-dark" style="font-size: 11px;" onclick="clearTagFilter()">Reset Filter</button>
        </div>`;
    }

    matchingPosts.forEach(post => {
      const postId = escapeHtml(post._id);
      const authorImage = escapeHtml(post.author?.avatar || DEFAULT_AVATAR);
      const authorName = escapeHtml(post.author?.name || "Unknown User");
      const authorUsername = escapeHtml(post.author?.username || "");
      const imageSrc = escapeHtml(post.image || "");

      const imageHtml = post.image ? `
        <div class="post-image-container" style="cursor: pointer;" data-src="${imageSrc}" onclick="openLightbox(this.dataset.src)">
          <img src="${imageSrc}" class="post-img" unselectable="on" />
        </div>` : "";

      let tagsHtml = "";
      if (post.tags && post.tags.length > 0) {
        tagsHtml = `<div class="post-tags-bar" style="display: flex; gap: 6px; flex-wrap: wrap; margin: 10px 0;">`;
        post.tags.forEach(tag => {
          const cleanTag = escapeHtml(tag.trim().replace("#", ""));
          tagsHtml += `<span class="badge bg-secondary text-light tag-chip" data-tag="${cleanTag}" style="font-size: 11px; padding: 5px 10px; border-radius: 6px; cursor: pointer;" onclick="filterByTag(this.dataset.tag)">#${cleanTag}</span>`;
        });
        tagsHtml += `</div>`;
      }

      const likesCount = post.likes ? post.likes.length : 0;
      const isLiked = currentUser && post.likes && post.likes.includes(currentUser._id);
      const heartIconClass = isLiked ? "fa-solid text-danger" : "fa-regular";

      const savesCount = post.savesCount || 0;
      const isSaved = savedIds.has(post._id);
      const saveIconClass = isSaved ? "fa-solid text-warning" : "fa-regular";

      const commentsCount = post.commentsCount || 0;
      const formattedTime = getRelativeTime(post.createdAt);

      // Edit and delete are shown only to the author of the post
      const isOwner = currentUser && post.author && post.author._id === currentUser._id;
      let ownerActionsHtml = "";
      if (isOwner) {
        ownerActionsHtml = `
          <div class="post-btns-right" style="position: absolute; top: 15px; right: 15px; display: flex; gap: 6px; z-index: 5;">
            <button class="action-btn edit-btn" onclick="openEditPostModal('${postId}')" title="Edit Post">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="action-btn delete-btn" onclick="deletePost('${postId}')" title="Delete Post">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        `;
      }

      allPostsHTML += `
      <div class="post-card" data-post-id="${postId}" style="position: relative;">
        ${ownerActionsHtml}
        
        <div class="post-author" style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; ${isOwner ? 'padding-right: 70px;' : ''}">
          <img src="${authorImage}" class="author-avatar" data-username="${authorUsername}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; cursor: pointer;" onclick="goToUserProfile(this.dataset.username)" title="View Profile" />
          <div class="author-info" style="display: flex; flex-direction: column; justify-content: center;">
            <h4 class="author-name" data-username="${authorUsername}" style="margin: 0; font-size: 16px; font-weight: 600; line-height: 1.2; cursor: pointer;" onclick="goToUserProfile(this.dataset.username)" title="View Profile">${authorName}</h4>
            <span class="post-time" style="margin-top: 3px; font-size: 12px; opacity: 0.7; line-height: 1;">${formattedTime}</span>
          </div>
        </div>

        <div class="post-texts">
          <h3>${escapeHtml(post.title || "")}</h3>
          <p>${escapeHtml(post.text || "")}</p>
        </div>

        ${imageHtml}
        ${tagsHtml}

        <div class="post-btns">
          <div class="post-btns-left" style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="action-btn like-btn" onclick="toggleLike('${postId}')" style="display: flex; align-items: center; gap: 6px; transition: transform 0.2s ease;">
              <i class="${heartIconClass} fa-heart" style="transition: all 0.3s ease;"></i> 
              <span class="count" style="transition: all 0.3s ease;">${likesCount}</span>
            </button>
            <button class="action-btn save-btn" onclick="toggleSavePost('${postId}')" style="display: flex; align-items: center; gap: 6px; transition: transform 0.2s ease;">
              <i class="${saveIconClass} fa-bookmark" style="transition: all 0.3s ease;"></i>
              <span class="count" style="transition: all 0.3s ease;">${savesCount}</span>
            </button>
            <button class="action-btn share-btn" onclick="sharePost('${postId}')">
              <i class="fa-solid fa-share-nodes"></i>
            </button>
            <button class="action-btn comment-btn" onclick="openCommentsModal('${postId}')" style="display: flex; align-items: center; gap: 6px;">
              <i class="fa-regular fa-comment"></i> <span class="count">${commentsCount}</span>
            </button>
          </div>
        </div>
      </div>`;
    });
  }

  if (typeof DOM !== 'undefined' && DOM.postsContainer) {
    DOM.postsContainer.innerHTML = allPostsHTML;
  } else {
    const container = document.getElementById("postsContainer");
    if (container) container.innerHTML = allPostsHTML;
  }
}

// Finds a post card on the page by its id
function findPostCard(postId) {
  return document.querySelector(`.post-card[data-post-id="${CSS.escape(postId)}"]`);
}

// Delete Post Function
window.deletePost = async function(postId) {
  if (!confirm("Are you sure you want to delete this post?")) return;

  try {
    await api(`/posts/${encodeURIComponent(postId)}`, { method: "DELETE" });
    showToast("Post deleted successfully!", "success");
    await fetchingPosts(typeof DOM !== 'undefined' && DOM.searchInput ? DOM.searchInput.value : "", state.activeTagFilter, { loader: true });
  } catch (err) {
    showToast(err.message, "error");
  }
};

window.filterByTag = function(tagName) {
  state.activeTagFilter = tagName;
  fetchingPosts(typeof DOM !== 'undefined' && DOM.searchInput ? DOM.searchInput.value : "", tagName, { loader: true });
};

window.clearTagFilter = function() {
  state.activeTagFilter = null;
  fetchingPosts(typeof DOM !== 'undefined' && DOM.searchInput ? DOM.searchInput.value : "", null, { loader: true });
};

window.toggleLike = async function(postId) {
  if (!isLoggedIn()) {
    showToast("Please login to like posts!", "error");
    return;
  }

  try {
    const { active, count } = await api(`/posts/${encodeURIComponent(postId)}/like`, { method: "POST" });

    const postCard = findPostCard(postId);
    const likeBtnIcon = postCard?.querySelector(".like-btn i");
    const likeCountSpan = postCard?.querySelector(".like-btn .count");

    if (postCard) {
      const btn = postCard.querySelector(".like-btn");
      btn.style.transform = "scale(1.2)";
      setTimeout(() => btn.style.transform = "scale(1)", 200);
    }

    if (likeBtnIcon) {
      if (active) {
        likeBtnIcon.className = "fa-solid fa-heart text-danger";
        likeBtnIcon.style.transform = "scale(1.3)";
        setTimeout(() => likeBtnIcon.style.transform = "scale(1)", 300);
      } else {
        likeBtnIcon.className = "fa-regular fa-heart";
      }
    }

    if (likeCountSpan) likeCountSpan.textContent = count;
  } catch (err) {
    showToast(err.message, "error");
  }
};

window.toggleSavePost = async function(postId) {
  if (!isLoggedIn()) {
    showToast("Please login to save posts!", "error");
    return;
  }

  try {
    const { active, count } = await api(`/posts/${encodeURIComponent(postId)}/save`, { method: "POST" });

    if (active) savedIds.add(postId);
    else savedIds.delete(postId);

    const postCard = findPostCard(postId);
    const saveBtn = postCard?.querySelector(".save-btn");
    const saveIcon = saveBtn?.querySelector("i");
    const saveCountSpan = saveBtn?.querySelector(".count");

    if (saveBtn) {
      saveBtn.style.transform = "scale(1.2)";
      setTimeout(() => saveBtn.style.transform = "scale(1)", 200);
    }

    if (active) {
      if (saveIcon) {
        saveIcon.className = "fa-solid fa-bookmark text-warning";
        saveIcon.style.transform = "scale(1.3)";
        setTimeout(() => saveIcon.style.transform = "scale(1)", 300);
      }
      showToast("Post saved successfully! 📌", "success");
    } else {
      if (saveIcon) saveIcon.className = "fa-regular fa-bookmark";
      showToast("Post removed from saved items", "success");
    }

    if (saveCountSpan) saveCountSpan.textContent = count;
  } catch (err) {
    showToast(err.message, "error");
  }
};

window.sharePost = async function(postId) {
  const post = loadedPosts.find(p => p._id === postId);

  const shareData = {
    title: post ? post.title : "Moka Cafe Post",
    text: post ? (post.text || "").substring(0, 100) + "..." : "Check out this post on Moka Cafe",
    url: window.location.href.split('#')[0] + `#post-${postId}`
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareData.url);
      showToast("Post link copied to clipboard! 🔗", "success");
    }
  } catch (err) {
    if (err.name !== 'AbortError') showToast("Failed to share post", "error");
  }
};
