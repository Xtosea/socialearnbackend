// utils/embedUrl.js
export const getEmbedUrl = (url, platform) => {
  try {
    platform = platform.toLowerCase().trim();

    // -------------------------
    // YOUTUBE
    // -------------------------
    if (platform === "youtube") {
      let videoId = "";
      if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1].split("?")[0];
      } else if (url.includes("watch?v=")) {
        videoId = url.split("watch?v=")[1].split("&")[0];
      } else if (url.includes("m.youtube.com")) {
        videoId = url.split("v=")[1].split("&")[0];
      }
      return `https://www.youtube.com/embed/${videoId}`;
    }

    // -------------------------
    // TIKTOK
    // -------------------------
    if (platform === "tiktok") {
      // Example: https://www.tiktok.com/@user/video/1234567890
      const match = url.match(/video\/(\d+)/);
      if (match) {
        return `https://www.tiktok.com/embed/v2/${match[1]}`;
      }
    }

    // -------------------------
    // FACEBOOK
    // -------------------------
    if (platform === "facebook") {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        url
      )}&show_text=false&width=560`;
    }

    // -------------------------
    // INSTAGRAM
    // -------------------------
    if (platform === "instagram") {
      // Normal Instagram post
      if (url.includes("/p/")) {
        const postId = url.split("/p/")[1].split("/")[0];
        return `https://www.instagram.com/p/${postId}/embed/`;
      }
      // Instagram reels
      if (url.includes("/reel/")) {
        const reelId = url.split("/reel/")[1].split("/")[0];
        return `https://www.instagram.com/reel/${reelId}/embed/`;
      }
    }

    // -------------------------
    // TWITTER / X
    // -------------------------
    if (platform === "twitter" || platform === "x") {
      return `https://twitframe.com/show?url=${encodeURIComponent(url)}`;
    }

    return url; // fallback if no match
  } catch (err) {
    console.error("Invalid video URL:", url, err);
    return url;
  }
};