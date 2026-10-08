// ==========================================
// COMMENTS SYSTEM MANAGEMENT
// ==========================================

// Comments of the post that is open in the modal
let currentComments = [];

document.addEventListener("DOMContentLoaded", () => {
  initCommentsModal();
});

// Helper function to calculate elapsed time (2m ago, 1h ago, etc.)
function timeAgo(dateParam) {
  if (!dateParam) return "Just now";
  const date = typeof dateParam === 'object' ? dateParam : new Date(dateParam);
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function initCommentsModal() {
  if (document.getElementById("customCommentsModal")) return;

  const commentsModalHTML = `
    <div id="customCommentsModal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:#121212; z-index:99999; flex-direction: column; overflow: hidden; animation: fadeInModal 0.25s ease;">
      <div style="padding: 16px 20px; background: #1a1a1a; border-bottom: 1px solid #2a2a2a; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <button onclick="closeCommentsModal()" style="background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; padding: 4px 8px;"><i class="fa-solid fa-arrow-left"></i></button>
          <h5 style="margin: 0; font-size: 17px; font-weight: 600; color: #fff;">Comments</h5>
        </div>
        <span id="commentsCountHeader" style="font-size: 13px; color: #aaa;">0 comments</span>
      </div>

      <div id="commentsListContainer" style="padding: 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 16px; max-width: 800px; width: 100%; margin: 0 auto;"></div>

      <div style="padding: 14px 20px; background: #1a1a1a; border-top: 1px solid #2a2a2a; display: flex; gap: 12px; align-items: center; width: 100%;">
        <div style="max-width: 800px; width: 100%; margin: 0 auto; display: flex; gap: 10px;">
          <input type="text" id="commentInputText" maxlength="500" placeholder="Write a comment..." style="flex: 1; background: #252525; border: 1px solid #3d3d3d; border-radius: 24px; padding: 12px 18px; color: #fff; outline: none; font-size: 14px;" />
          <button id="submitCommentBtn" style="background: #9333ea; color: white; border: none; width: 45px; height: 45px; border-radius: 50%; font-size: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer;"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', commentsModalHTML);

  const styleAnim = document.createElement('style');
  styleAnim.innerHTML = `@keyframes fadeInModal { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`;
  document.head.appendChild(styleAnim);

  const submitBtn = document.getElementById("submitCommentBtn");
  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      if (!isLoggedIn()) {
        showToast("Please login to comment!", "error");
        return;
      }

      const modal = document.getElementById("customCommentsModal");
      const postId = modal ? modal.dataset.currentPostId : null;
      const input = document.getElementById("commentInputText");
      const commentText = input ? input.value.trim() : "";

      if (!postId || !commentText) return;

      submitBtn.disabled = true;
      try {
        const data = await api(`/posts/${encodeURIComponent(postId)}/comments`, {
          method: "POST",
          body: { text: commentText }
        });

        input.value = "";
        currentComments.push(data.comment);
        renderCommentsList(currentComments);

        const postCard = document.querySelector(`.post-card[data-post-id="${CSS.escape(postId)}"]`);
        if (postCard) {
          const commentCountSpan = postCard.querySelector(".comment-btn .count");
          if (commentCountSpan) commentCountSpan.textContent = currentComments.length;
        }

        showToast("Comment posted successfully! 💬", "success");
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
}

window.openCommentsModal = async function(postId) {
  if (!isLoggedIn()) {
    showToast("Please login first to view and write comments!", "error");
    return;
  }

  initCommentsModal();

  const modal = document.getElementById("customCommentsModal");
  const container = document.getElementById("commentsListContainer");
  if (!modal) return;

  modal.dataset.currentPostId = postId;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";

  currentComments = [];
  if (container) {
    container.innerHTML = `<p style="color: #777; text-align: center; margin-top: 50px;">Loading...</p>`;
  }

  try {
    const data = await api(`/posts/${encodeURIComponent(postId)}/comments`);
    // The user may have opened another post while this one was loading
    if (modal.dataset.currentPostId !== String(postId)) return;
    currentComments = data.comments;
    renderCommentsList(currentComments);
  } catch (err) {
    closeCommentsModal();
    showToast(err.message, "error");
  }
};

window.closeCommentsModal = function() {
  const modal = document.getElementById("customCommentsModal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }
};

function renderCommentsList(comments) {
  const container = document.getElementById("commentsListContainer");
  const countHeader = document.getElementById("commentsCountHeader");
  if (!container) return;

  const count = comments.length;
  if (countHeader) countHeader.textContent = `${count} comment${count === 1 ? '' : 's'}`;

  if (count === 0) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #777; gap: 10px; margin-top: 50px;">
        <i class="fa-regular fa-comment-dots" style="font-size: 40px; opacity: 0.5;"></i>
        <p style="margin: 0; font-size: 14px;">No comments yet. Start the conversation!</p>
      </div>`;
    return;
  }

  let html = "";
  comments.forEach(comment => {
    html += `
      <div style="display: flex; gap: 12px; align-items: flex-start; animation: fadeInModal 0.2s ease;">
        <img src="${escapeHtml(comment.author?.avatar || DEFAULT_AVATAR)}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover;" />
        <div style="background: #1a1a1a; padding: 10px 14px; border-radius: 12px; flex: 1; border: 1px solid #252525;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 13px; font-weight: 600; color: #e2e2e2;">${escapeHtml(comment.author?.name || "User")}</span>
            <span style="font-size: 11px; color: #777;">${timeAgo(comment.createdAt)}</span>
          </div>
          <p style="margin: 0; font-size: 14px; color: #ccc; word-break: break-word; line-height: 1.4;">${escapeHtml(comment.text)}</p>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}
