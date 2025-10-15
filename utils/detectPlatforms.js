// utils/detectPlatform.js
export const detectPlatformFromUrl = (url) => {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/tiktok\.com/.test(url)) return "tiktok";
  if (/instagram\.com/.test(url)) return "instagram";
  if (/facebook\.com/.test(url)) return "facebook";
  if (/twitter\.com|x\.com/.test(url)) return "twitter";
  return "unknown";
};