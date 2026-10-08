// ==========================================
// SCRIPT: MODALS MANAGEMENT (LIGHTBOX, CREATE/EDIT POST MODALS)
// ==========================================

function initLightboxModal() {
  if (document.getElementById("customLightboxModal")) return;
  const lightboxHTML = `
    <div id="customLightboxModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0, 0, 0, 0.85); backdrop-filter: blur(10px); z-index:9999; justify-content:center; align-items:center; padding: 40px; cursor: pointer;">
      <button style="position:absolute; top:25px; right:30px; background: rgba(255,255,255,0.1); border: none; color:white; width: 45px; height: 45px; border-radius: 50%; font-size:22px; cursor:pointer; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-xmark"></i></button>
      <div style="position: relative; max-width: 90%; max-height: 90vh; display: flex; justify-content: center; align-items: center;" onclick="event.stopPropagation()">
        <img id="lightboxImg" style="max-width: 100%; max-height: 85vh; object-fit: contain; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1);" />
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', lightboxHTML);

  document.getElementById("customLightboxModal").addEventListener("click", () => {
    document.getElementById("customLightboxModal").style.display = "none";
    document.body.style.overflow = "auto";
  });
}

function openLightbox(imgSrc) {
  const modal = document.getElementById("customLightboxModal");
  const img = document.getElementById("lightboxImg");
  if (modal && img) {
    img.src = imgSrc;
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}

// Open Edit Post Modal Function
window.openEditPostModal = function(postId) {
  // loadedPosts (post.js) holds the posts currently shown in the feed
  const post = loadedPosts.find(p => p._id === postId);
  if (!post) return;

  const editModal = document.getElementById("editPostModal");
  const editIdInput = document.getElementById("editPostIdInput");
  const editTitleInput = document.getElementById("editPostTitleInput");
  const editDescInput = document.getElementById("editPostDescInput");
  const editTagsInput = document.getElementById("editPostTagsInput");

  if (editIdInput) editIdInput.value = post._id;
  if (editTitleInput) editTitleInput.value = post.title || "";
  if (editDescInput) editDescInput.value = post.text || "";
  if (editTagsInput) editTagsInput.value = post.tags ? post.tags.join(", ") : "";

  if (editModal) editModal.style.display = "flex";
};
