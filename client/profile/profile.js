// ==========================================
// PROFILE PAGE LOGIC & POSTS RENDERING
// ==========================================

// This page has no toast element, so messages use alert
function showToast(message) {
    alert(message);
}

// Helper function to calculate relative time (accepts a date string or a timestamp)
function getRelativeTime(timestamp) {
  if (!timestamp) return "Just now";
  const elapsedSeconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);

  if (elapsedSeconds < 60) return "Just now";
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)} minutes ago`;
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)} hours ago`;
  return `${Math.floor(elapsedSeconds / 86400)} days ago`;
}

// Waits for an image to finish loading (or fail, or 5 seconds) so the page does not pop in piece by piece
function waitForImage(img) {
    return new Promise((resolve) => {
        if (!img || img.complete) return resolve();
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
        setTimeout(resolve, 5000);
    });
}

// State of the page
let profileUser = null;   // the user whose profile is shown
let isOwnProfile = false; // true when you are looking at your own profile
let userPosts = [];       // posts written by profileUser
let savedPosts = [];      // posts YOU saved
let savedIds = new Set(); // ids of the posts you saved (bookmark icon)
let activeTab = 'posts';  // 'posts' or 'saved'
let currentComments = []; // comments of the post open in the comments modal

const DEFAULT_COVER = "/files/vergilc.jpg";

document.addEventListener('DOMContentLoaded', async () => {
    const userAvatarImg = document.getElementById('userAvatar');
    const avatarContainer = document.getElementById('avatarContainer');
    const avatarUploadInput = document.getElementById('avatarUploadInput');

    const coverImage = document.getElementById('coverImage');
    const editCoverBtn = document.getElementById('editCoverBtn');
    const coverUploadInput = document.getElementById('coverUploadInput');

    const userBioText = document.getElementById('userBioText');
    const userPostsTab = document.getElementById('userPostsTab');
    const savedItemsTab = document.getElementById('savedItemsTab');
    const profileContentArea = document.getElementById('profileContentArea');

    const postsCountEl = document.getElementById('postsCount');
    const savedCountEl = document.getElementById('savedCount');

    // Only logged-in users can see profiles
    await loadSession();
    if (!isLoggedIn()) {
        alert("Please login first to view profiles!");
        window.location.href = "../index.html";
        return;
    }

    // /profile/profile.html?username=someone shows that user, otherwise your own profile
    const requestedUsername = new URLSearchParams(window.location.search).get('username');
    const profileUsername = (requestedUsername || currentUser.username).toLowerCase();
    isOwnProfile = profileUsername === currentUser.username;

    // Fill the profile header with the loaded user
    function renderProfileHeader() {
        if (userAvatarImg) userAvatarImg.src = profileUser.avatar || DEFAULT_AVATAR;
        if (coverImage) coverImage.src = profileUser.cover || DEFAULT_COVER;
        if (userBioText) userBioText.textContent = profileUser.bio || "No bio yet.";

        const nameHeading = document.querySelector('.user-name-row h1');
        if (nameHeading) nameHeading.textContent = profileUser.name;

        const handleSpan = document.querySelector('.user-handle');
        if (handleSpan) handleSpan.textContent = `@${profileUser.username}`;
    }

    // Update user statistics counters
    function updateStats() {
        if (postsCountEl) postsCountEl.textContent = userPosts.length;
        if (savedCountEl) savedCountEl.textContent = savedPosts.length;
    }

    // Applies a change to a post in every list that holds a copy of it
    function updateInLists(postId, change) {
        [userPosts, savedPosts].forEach(list => {
            list.forEach(post => { if (post._id === postId) change(post); });
        });
    }

    // Uploads a picture and saves it on the profile (field: "avatar" or "cover")
    async function changeProfileImage(file, field, maxWidth, maxHeight) {
        showLoader();
        try {
            const blob = await imageToBlob(file, maxWidth, maxHeight, 0.75);
            const url = await uploadImage(blob);
            await api('/users/me', { method: 'PATCH', body: { [field]: url } });
            profileUser[field] = url;
            if (field === 'avatar') {
                // Your posts show your avatar too
                userPosts.forEach(post => { if (post.author) post.author.avatar = url; });
            }
            await refreshSession();
            renderProfileHeader();
            renderActiveTab();
            await Promise.all([waitForImage(userAvatarImg), waitForImage(coverImage)]);
            hideLoader();
            alert(field === 'avatar' ? 'Profile picture updated successfully!' : 'Cover photo updated successfully!');
        } catch (err) {
            hideLoader();
            alert(err.message);
        }
    }

    window.handleUserProfileClick = (username) => {
        if (!username) return;
        window.location.href = `profile.html?username=${encodeURIComponent(username)}`;
    };

    // Generate HTML card for a single post
    function generatePostCardHTML(post) {
        const author = post.author || {};
        const postId = escapeHtml(post._id);
        const authorImage = escapeHtml(author.avatar || DEFAULT_AVATAR);
        const authorName = escapeHtml(author.name || "User");
        const authorUsername = escapeHtml(author.username || "");
        const imageSrc = escapeHtml(post.image || "");
        const isOwner = author._id === currentUser._id;

        const imageHtml = post.image ? `
            <div class="post-image-container" style="cursor: pointer; margin-top: 10px;" data-src="${imageSrc}" onclick="openLightbox(this.dataset.src)">
              <img src="${imageSrc}" class="post-img" style="width: 100%; max-height: 280px; object-fit: cover; border-radius: 8px;" />
            </div>` : "";

        let tagsHtml = "";
        if (post.tags?.length > 0) {
            tagsHtml = `<div class="post-tags-bar" style="display: flex; gap: 6px; flex-wrap: wrap; margin: 8px 0;">`;
            post.tags.forEach(tag => {
                tagsHtml += `<span class="badge bg-secondary text-light tag-chip" style="font-size: 11px; padding: 4px 8px; border-radius: 6px; background: #251b37; color: #c084fc;">#${escapeHtml(tag.trim().replace("#", ""))}</span>`;
            });
            tagsHtml += `</div>`;
        }

        const isLiked = post.likes?.includes(currentUser._id);
        const isSaved = savedIds.has(post._id);

        const ownerActionsHTML = isOwner ? `
            <div style="display: flex; gap: 6px;">
                <button onclick="openEditPostModal('${postId}')" title="Edit" style="background: rgba(255,255,255,0.05); border: none; color: #c084fc; width: 30px; height: 30px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-pen" style="font-size: 12px;"></i></button>
                <button onclick="deletePost('${postId}')" title="Delete" style="background: rgba(239,68,68,0.1); border: none; color: #ef4444; width: 30px; height: 30px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-trash-can" style="font-size: 12px;"></i></button>
            </div>
        ` : '';

        return `
        <div class="post-card" data-post-id="${postId}" style="background: #151024; padding: 14px; border-radius: 14px; margin-bottom: 16px; text-align: left; font-size: 13px; border: 1px solid #2a2040; box-shadow: 0 4px 16px rgba(0,0,0,0.4);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <div class="post-author" data-username="${authorUsername}" style="display: flex; align-items: center; gap: 10px; cursor: pointer;" onclick="handleUserProfileClick(this.dataset.username)">
                  <img src="${authorImage}" class="author-avatar" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover;" />
                  <div class="author-info" style="display: flex; flex-direction: column; justify-content: center;">
                    <h4 class="author-name" style="margin: 0; font-size: 14px; font-weight: 600; color: #fff;">${authorName}</h4>
                    <span class="post-time" style="font-size: 11px; color: #9ca3af;">${getRelativeTime(post.createdAt)}</span>
                  </div>
                </div>
                ${ownerActionsHTML}
            </div>
            <div class="post-texts" style="color: #e5e7eb;">
              <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 4px; color: #fff;">${escapeHtml(post.title || "")}</h3>
              <p style="font-size: 12.5px; color: #d1d5db; margin: 0;">${escapeHtml(post.text || "")}</p>
            </div>
            ${imageHtml}
            ${tagsHtml}
            <div class="post-btns" style="display: flex; gap: 18px; margin-top: 10px; padding-top: 8px; border-top: 1px solid #251b37;">
              <button onclick="toggleLike('${postId}')" style="background: none; border: none; color: #9ca3af; cursor: pointer; display: flex; align-items: center; gap: 5px; font-size: 12px;">
                <i class="${isLiked ? 'fa-solid text-danger' : 'fa-regular'} fa-heart" style="${isLiked ? 'color: #ef4444;' : ''}"></i> 
                <span>${post.likes?.length || 0}</span>
              </button>
              <button onclick="toggleSavePost('${postId}')" style="background: none; border: none; color: #9ca3af; cursor: pointer; display: flex; align-items: center; gap: 5px; font-size: 12px;">
                <i class="${isSaved ? 'fa-solid text-warning' : 'fa-regular'} fa-bookmark" style="${isSaved ? 'color: #f59e0b;' : ''}"></i>
                <span>${post.savesCount || 0}</span>
              </button>
              <button onclick="sharePost('${postId}')" style="background: none; border: none; color: #9ca3af; cursor: pointer; display: flex; align-items: center; gap: 5px; font-size: 12px;">
                <i class="fa-solid fa-share-nodes"></i>
              </button>
              <button onclick="openCommentsModal('${postId}')" style="background: none; border: none; color: #9ca3af; cursor: pointer; display: flex; align-items: center; gap: 5px; font-size: 12px;">
                <i class="fa-regular fa-comment"></i> <span>${post.commentsCount || 0}</span>
              </button>
            </div>
        </div>`;
    }

    // Render user posts in the profile view
    function renderUserPosts() {
        if (!profileContentArea) return;
        profileContentArea.innerHTML = userPosts.length ? 
            userPosts.map(post => generatePostCardHTML(post)).join('') : 
            '<p style="color: #9ca3af; font-size: 13px; text-align: center; padding: 40px 0;">No posts published yet.</p>';
    }

    // Render saved items in the profile view
    function renderSavedItems() {
        if (!profileContentArea) return;
        profileContentArea.innerHTML = savedPosts.length ? 
            savedPosts.map(post => generatePostCardHTML(post)).join('') : 
            '<p style="color: #9ca3af; font-size: 13px; text-align: center; padding: 40px 0;">No saved items found.</p>';
    }

    // Draws whichever tab is open
    function renderActiveTab() {
        if (activeTab === 'saved') renderSavedItems();
        else renderUserPosts();
    }

    // Delete a specific post by ID
    window.deletePost = async function(postId) {
        if (!confirm("Are you sure you want to permanently delete this post?")) return;

        showLoader();
        try {
            await api(`/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
            userPosts = userPosts.filter(p => p._id !== postId);
            savedPosts = savedPosts.filter(p => p._id !== postId);
            savedIds.delete(postId);
            renderActiveTab();
            updateStats();
        } catch (err) {
            alert(err.message);
        } finally {
            hideLoader();
        }
    };

    // Initialize edit post modal DOM structure
    function initEditPostModalDOM() {
        if (document.getElementById("customEditPostModal")) return;
        document.body.insertAdjacentHTML('beforeend', `
          <div id="customEditPostModal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); z-index:99999; justify-content:center; align-items:center; padding: 20px;">
            <div style="background: #1a1528; border: 1px solid #3b2a56; padding: 20px; border-radius: 14px; width: 100%; max-width: 500px; display: flex; flex-direction: column; gap: 12px;">
              <h3 style="margin: 0; color: #fff; font-size: 16px;">Edit Post</h3>
              <input type="text" id="editPostTitleInput" placeholder="Title..." style="background: #120e1d; border: 1px solid #2d2342; padding: 10px; border-radius: 8px; color: #fff; outline: none;" />
              <textarea id="editPostBodyInput" rows="4" placeholder="Content..." style="background: #120e1d; border: 1px solid #2d2342; padding: 10px; border-radius: 8px; color: #fff; outline: none; resize: none;"></textarea>
              <input type="text" id="editPostTagsInput" placeholder="Tags (comma separated)" style="background: #120e1d; border: 1px solid #2d2342; padding: 10px; border-radius: 8px; color: #fff; outline: none;" />
              <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button onclick="closeEditPostModal()" style="background: #2d2342; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancel</button>
                <button onclick="saveEditedPostData()" style="background: #9333ea; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Save</button>
              </div>
            </div>
          </div>
        `);
    }

    window.openEditPostModal = function(postId) {
        const post = userPosts.find(p => p._id === postId);
        if (!post) return;
        const modal = document.getElementById("customEditPostModal");
        modal.dataset.editingPostId = postId;
        document.getElementById("editPostTitleInput").value = post.title || "";
        document.getElementById("editPostBodyInput").value = post.text || "";
        document.getElementById("editPostTagsInput").value = post.tags ? post.tags.join(", ") : "";
        modal.style.display = "flex";
    };

    window.closeEditPostModal = () => document.getElementById("customEditPostModal").style.display = "none";

    window.saveEditedPostData = async function() {
        const modal = document.getElementById("customEditPostModal");
        const postId = modal.dataset.editingPostId;
        const title = document.getElementById("editPostTitleInput").value.trim();
        const text = document.getElementById("editPostBodyInput").value.trim();
        const tags = document.getElementById("editPostTagsInput").value.split(",").map(t => t.trim()).filter(Boolean);

        showLoader();
        try {
            const data = await api(`/posts/${encodeURIComponent(postId)}`, {
                method: 'PATCH',
                body: { title, text, tags }
            });
            updateInLists(postId, (post) => {
                post.title = data.post.title;
                post.text = data.post.text;
                post.tags = data.post.tags;
            });
            closeEditPostModal();
            renderActiveTab();
        } catch (err) {
            alert(err.message);
        } finally {
            hideLoader();
        }
    };

    // Tab switching event listeners
    if (userPostsTab && savedItemsTab) {
        userPostsTab.addEventListener('click', () => {
            activeTab = 'posts';
            userPostsTab.classList.add('active');
            savedItemsTab.classList.remove('active');
            renderUserPosts();
        });
        savedItemsTab.addEventListener('click', () => {
            activeTab = 'saved';
            savedItemsTab.classList.add('active');
            userPostsTab.classList.remove('active');
            renderSavedItems();
        });
    }

    // Toggle post like status
    window.toggleLike = async function(postId) {
        try {
            const { active } = await api(`/posts/${encodeURIComponent(postId)}/like`, { method: 'POST' });
            updateInLists(postId, (post) => {
                const others = (post.likes || []).filter(id => id !== currentUser._id);
                post.likes = active ? [...others, currentUser._id] : others;
            });
            renderActiveTab();
        } catch (err) {
            alert(err.message);
        }
    };

    // Toggle save post status
    window.toggleSavePost = async function(postId) {
        try {
            const { active, count } = await api(`/posts/${encodeURIComponent(postId)}/save`, { method: 'POST' });
            updateInLists(postId, (post) => { post.savesCount = count; });

            if (active) {
                savedIds.add(postId);
                const post = userPosts.find(p => p._id === postId);
                if (post && !savedPosts.some(p => p._id === postId)) {
                    savedPosts.push({ ...post });
                    savedPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                }
            } else {
                savedIds.delete(postId);
                savedPosts = savedPosts.filter(p => p._id !== postId);
            }

            renderActiveTab();
            updateStats();
        } catch (err) {
            alert(err.message);
        }
    };

    // Share post link utility
    window.sharePost = async function(postId) {
        const post = userPosts.find(p => p._id === postId) || savedPosts.find(p => p._id === postId);
        const url = `${window.location.href.split('#')[0]}#post-${postId}`;
        try {
            if (navigator.share) await navigator.share({ title: post?.title, url });
            else { await navigator.clipboard.writeText(url); alert("Link copied!"); }
        } catch {}
    };

    // Initialize image lightbox modal
    function initLightboxModal() {
        if (document.getElementById("customLightboxModal")) return;
        document.body.insertAdjacentHTML('beforeend', `
          <div id="customLightboxModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; justify-content:center; align-items:center; cursor:pointer;" onclick="this.style.display='none'">
            <img id="lightboxImg" style="max-width:90%; max-height:85vh; border-radius:12px;" />
          </div>
        `);
    }

    window.openLightbox = (src) => {
        document.getElementById("lightboxImg").src = src;
        document.getElementById("customLightboxModal").style.display = "flex";
    };

    // Initialize comments modal and handlers
    function initCommentsModal() {
        if (document.getElementById("customCommentsModal")) return;
        document.body.insertAdjacentHTML('beforeend', `
          <div id="customCommentsModal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:#121212; z-index:99999; flex-direction:column;">
            <div style="padding:14px; background:#1a1a1a; display:flex; justify-content:space-between; align-items:center;">
              <button onclick="closeCommentsModal()" style="background:none; border:none; color:#fff; font-size:18px; cursor:pointer;"><i class="fa-solid fa-arrow-left"></i></button>
              <span id="commentsCountHeader" style="color:#aaa; font-size:12px;">0 comments</span>
            </div>
            <div id="commentsListContainer" style="padding:15px; overflow-y:auto; flex:1; max-width:800px; width:100%; margin:0 auto; display:flex; flex-direction:column; gap:12px;"></div>
            <div style="padding:12px; background:#1a1a1a; display:flex; justify-content:center;">
              <div style="max-width:800px; width:100%; display:flex; gap:8px;">
                <input type="text" id="commentInputText" maxlength="500" placeholder="Write a comment..." style="flex:1; background:#252525; border:1px solid #3d3d3d; border-radius:20px; padding:10px 15px; color:#fff; outline:none;" />
                <button id="submitCommentBtn" style="background:#9333ea; color:white; border:none; width:40px; height:40px; border-radius:50%; cursor:pointer;"><i class="fa-solid fa-paper-plane"></i></button>
              </div>
            </div>
          </div>
        `);

        const submitBtn = document.getElementById("submitCommentBtn");
        submitBtn.addEventListener("click", async () => {
            const modal = document.getElementById("customCommentsModal");
            const postId = modal.dataset.currentPostId;
            const input = document.getElementById("commentInputText");
            const text = input.value.trim();
            if (!postId || !text) return;

            submitBtn.disabled = true;
            try {
                const data = await api(`/posts/${encodeURIComponent(postId)}/comments`, {
                    method: 'POST',
                    body: { text }
                });
                currentComments.push(data.comment);
                input.value = "";
                renderCommentsList(currentComments);
                updateInLists(postId, (post) => { post.commentsCount = currentComments.length; });
                renderActiveTab();
            } catch (err) {
                alert(err.message);
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    window.openCommentsModal = async function(postId) {
        initCommentsModal();
        const modal = document.getElementById("customCommentsModal");
        const container = document.getElementById("commentsListContainer");
        modal.dataset.currentPostId = postId;
        modal.style.display = "flex";

        currentComments = [];
        container.innerHTML = '<p style="color:#777; text-align:center; margin-top:40px;">Loading...</p>';

        try {
            const data = await api(`/posts/${encodeURIComponent(postId)}/comments`);
            // The user may have opened another post while this one was loading
            if (modal.dataset.currentPostId !== String(postId)) return;
            currentComments = data.comments;
            renderCommentsList(currentComments);
        } catch (err) {
            closeCommentsModal();
            alert(err.message);
        }
    };

    window.closeCommentsModal = () => document.getElementById("customCommentsModal").style.display = "none";

    // Render list of comments inside the comments modal
    function renderCommentsList(comments) {
        const container = document.getElementById("commentsListContainer");
        const countHeader = document.getElementById("commentsCountHeader");
        
        if (countHeader) countHeader.textContent = `${comments.length} comments`;
        container.innerHTML = comments.length ? comments.map(c => `
            <div style="display:flex; gap:10px; align-items:flex-start;">
              <img src="${escapeHtml(c.author?.avatar || DEFAULT_AVATAR)}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;" />
              <div style="background:#1a1a1a; padding:8px 12px; border-radius:10px; flex:1;">
                <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                  <span style="font-size:12px; font-weight:600; color:#e2e2e2;">${escapeHtml(c.author?.name || "User")}</span>
                  <span style="font-size:10px; color:#777;">${getRelativeTime(c.createdAt)}</span>
                </div>
                <p style="margin:0; font-size:13px; color:#ccc; word-break: break-word;">${escapeHtml(c.text)}</p>
              </div>
            </div>
        `).join('') : '<p style="color:#777; text-align:center; margin-top:40px;">No comments yet.</p>';
    }

    // Load the profile and the posts you saved
    try {
        const [profileData, savedData] = await Promise.all([
            api(`/users/${encodeURIComponent(profileUsername)}`),
            api('/posts/saved')
        ]);
        profileUser = profileData.user;
        userPosts = profileData.posts;
        savedPosts = savedData.posts;
        savedIds = new Set(savedPosts.map(p => p._id));
    } catch (err) {
        alert(err.status === 404 ? "User not found" : err.message);
        window.location.href = "../index.html";
        return;
    }

    // Other people's profiles are read-only and their saved items are private
    if (isOwnProfile) {
        if (avatarContainer && avatarUploadInput) {
            avatarContainer.addEventListener('click', () => avatarUploadInput.click());
            avatarUploadInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) await changeProfileImage(file, 'avatar', 400, 400);
                avatarUploadInput.value = "";
            });
        }
        if (editCoverBtn && coverUploadInput) {
            editCoverBtn.addEventListener('click', () => coverUploadInput.click());
            coverUploadInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) await changeProfileImage(file, 'cover', 1200, 600);
                coverUploadInput.value = "";
            });
        }
    } else {
        if (editCoverBtn) editCoverBtn.style.display = "none";
        if (avatarContainer) avatarContainer.removeAttribute('title');
        if (savedItemsTab) savedItemsTab.style.display = "none";
        if (savedCountEl) {
            savedCountEl.parentElement.style.display = "none";
            const separator = document.querySelector('.stat-separator');
            if (separator) separator.style.display = "none";
        }
    }

    initLightboxModal();
    initCommentsModal();
    initEditPostModalDOM();

    renderProfileHeader();
    updateStats();
    renderUserPosts();

    // Show the page only when your data and your pictures are ready
    await Promise.all([waitForImage(userAvatarImg), waitForImage(coverImage)]);
    hideLoader();
});
