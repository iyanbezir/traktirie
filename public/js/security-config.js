/**
 * ============================================================
 * TraktiRie Security Config — bot protection + Email OTP
 * ============================================================
 *
 * 1) CLOUDFLARE TURNSTILE
 *    - https://dash.cloudflare.com/ → Turnstile → Add site
 *    - Domain: your-domain.vercel.app (or * for testing)
 *    - Widget Mode: Managed
 *    - Site Key → put it below (Secret Key stays on the backend only)
 *
 * 2) EMAIL OTP (real emails via EmailJS)
 *    Setup steps:
 *    a. Sign up at https://www.emailjs.com/ (free 200 emails/month)
 *    b. Email Services → Add New Service → pick Gmail/Outlook/etc → Connect
 *    c. Email Templates → Create New Template
 *       Subject example:  Verification Code TraktiRie — {{otp_code}}
 *       Body (HTML) example:
 *
 *         Hi {{username}},
 *
 *         {{message}}
 *
 *         Your verification code:
 *         <h1 style="letter-spacing:8px">{{otp_code}}</h1>
 *
 *         Valid for {{expiry_minutes}} minutes.
 *         If you didn't request this, just ignore the email.
 *
 *         — TraktiRie team
 *
 *       Available variables:
 *         {{to_email}}  {{otp_code}}  {{username}}
 *         {{message}}   {{subject}}   {{expiry_minutes}}
 *         {{app_name}}
 *
 *    d. Account → API Keys → copy Public Key
 *    e. Fill publicKey, serviceId, templateId below
 *    f. Set provider: 'emailjs'
 * ============================================================
 */

const SECURITY_CONFIG = {
  // Cloudflare Turnstile
  turnstile: {
    enabled: true,
    // Site Key from Cloudflare Dashboard → Turnstile
    // Example: '0x4AAAAAAA...'  (leave empty = widget hidden)
    siteKey: '0x4AAAAAAFJkjHW9tEGk3o_C',
    theme: 'dark', // 'light' | 'dark' | 'auto'
    size: 'normal' // 'normal' | 'compact' | 'flexible'
  },

  // Email OTP
  emailOtp: {
    enabled: true,
    codeLength: 6,
    expiryMinutes: 10,
    maxAttempts: 5,

    // 'demo'    = development provider (code not shown in UI)
    // 'emailjs' = send a real email
    provider: 'emailjs',

    // ——— CUSTOM EMAIL TEXT ———
    // Change freely. Used in the EmailJS template as {{message}}, {{subject}}, etc.
    appName: 'TraktiRie',
    subject: 'Verification Code {{app_name}} — {{otp_code}}',
    message: 'Thanks for signing up for TraktiRie! Use the code below to verify your email and finish creating your creator account.',

    emailjs: {
      publicKey: '1tB-7m4ldswZpSb34',   // Account → API Keys → Public Key
      serviceId: 'service_traktirie',   // Email Services → Service ID (e.g. service_abc123)
      templateId: 'template_traktirie'   // Email Templates → Template ID (e.g. template_xyz789)
    }
  }
};

if (typeof window !== 'undefined') {
  window.TraktiRieSecurity = { SECURITY_CONFIG };
}
