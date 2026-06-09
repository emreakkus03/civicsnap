export const sanitizeUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/')) {
    return url;
  }
  
  return undefined; 
};