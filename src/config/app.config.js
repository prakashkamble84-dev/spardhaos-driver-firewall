/**
 * SpardhaOS identity and authentication configuration.
 */
export const APP_CONFIG = {
  name: 'SpardhaOS',
  tagline: 'तुमचा अभ्यास. तुमचा प्लॅन. तुमची प्रगती.',
  emoji: '📚',
  icon: 'BookOpenCheck',
  defaultTheme: 'light',
  defaultLoginRoute: '/student/login',
};

export const AUTH_PROFILES = [
  {
    key: 'student',
    name: 'Student_c',
    label: 'विद्यार्थी',
    profileSlug: '|fepmtlWDxLzg5/ci1NZD3vO7G6dXhMtk8PgBkRbWhK4=',
    redirectAfterAuth: '/',
    hasSignup: true,
    reportsTo: 'Admin_c',
    authPage: {
      loginTitle: 'SpardhaOS मध्ये पुन्हा स्वागत',
      signupTitle: 'तुमचे मोफत विद्यार्थी खाते तयार करा',
      loginDescription: 'तुमचा अभ्यास प्लॅन पुढे सुरू ठेवा.',
      signupDescription: 'MPSC आणि महाराष्ट्रातील स्पर्धा परीक्षांची तयारी मराठीतून सुरू करा.',
    },
    altLinksLeadIn: 'प्रशासक आहात?',
    altLinks: [
      { href: '/admin/login', label: 'Admin म्हणून लॉग इन करा' },
    ],
  },
  {
    key: 'admin',
    name: 'Admin_c',
    label: 'प्रशासक',
    profileSlug: '|fepmtlWDxLzg5/ci1NZD3kJJpvGBlxxHSRY/XznJR/s=',
    redirectAfterAuth: '/',
    hasSignup: false,
    reportsTo: null,
    authPage: {
      loginTitle: 'SpardhaOS Admin Login',
      signupTitle: 'Admin account creation is disabled',
      loginDescription: 'प्रशासकीय खात्यातून लॉग इन करा.',
      signupDescription: null,
    },
    altLinksLeadIn: 'विद्यार्थी आहात?',
    altLinks: [
      { href: '/student/login', label: 'विद्यार्थी म्हणून लॉग इन करा' },
    ],
  },
];

export const GENERIC_AUTH = {
  loginTitle: 'SpardhaOS मध्ये पुन्हा स्वागत',
  signupTitle: 'तुमचे मोफत खाते तयार करा',
  loginDescription: 'तुमचा अभ्यास प्लॅन पुढे सुरू ठेवा.',
  signupDescription: 'MPSC आणि महाराष्ट्रातील स्पर्धा परीक्षांची तयारी मराठीतून सुरू करा.',
  redirectAfterAuth: '/',
};
