// utils/youtube.js
export const getEmbedUrl = (url) => {
  try {
    let videoId = "";

    if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1].split("?")[0];
    } else if (url.includes("watch?v=")) {
      videoId = url.split("watch?v=")[1].split("&")[0];
    } else if (url.includes("m.youtube.com")) {
      videoId = url.split("v=")[1].split("&")[0];
    }

    return `https://www.youtube.com/embed/${videoId}`;
  } catch (err) {
    console.error("Invalid YouTube URL:", url);
    return url;
  }
};