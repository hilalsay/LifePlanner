// Front-end feature flags.

// OAuth ("Continue with Google / GitHub") is hidden until the backend is
// configured with the provider client IDs/secrets. Flip to true once
// GOOGLE_CLIENT_ID/SECRET and GITHUB_CLIENT_ID/SECRET are set in backend/.env.
export const OAUTH_ENABLED = false;
