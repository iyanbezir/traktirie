/**
 * TraktiRie Backend Config
 * ------------------------------------------------------------
 * Values here are safe for the browser (public keys only).
 * Secrets stay on the server (.env), never in this file.
 */
window.TraktiRieBackend = {
  supabase: {
    url: 'https://ksqozdkvndmnkqsgtvum.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcW96ZGt2bmRtbmtxc2d0dnVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MDU4NDEsImV4cCI6MjEwNjI4MTg0MX0.RcLAFPjHq8IQ13CeRhDR69E3WgwX4bwW1GbQ8eBaSHI'
  },
  cloudinary: {
    cloudName: 'herq47fz',
    uploadPreset: 'traktirie'
  }
};
