export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_ENTRA_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_ENTRA_TENANT_ID}`,
    redirectUri: window.location.origin,
    navigateToLoginRequestUrl: false,
  },
  cache: { cacheLocation: 'sessionStorage' },
}

export const loginRequest = { scopes: ['openid', 'profile', 'email'] }
