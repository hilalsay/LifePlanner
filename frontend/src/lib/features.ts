// Front-end feature flags.

// OAuth ("Continue with Google / GitHub") is hidden until the backend is
// configured with the provider client IDs/secrets. Flip to true once
// GOOGLE_CLIENT_ID/SECRET and GITHUB_CLIENT_ID/SECRET are set in backend/.env.
export const OAUTH_ENABLED = true;

// GitHub login is hidden for now (backend creds not set up). Flip to true to
// re-enable the "Continue with GitHub" button.
export const GITHUB_ENABLED = false;
