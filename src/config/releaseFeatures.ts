/**
 * Public release feature gates.
 *
 * Cloud Sync remains disabled in 1.0.1 until a server-authorized, one-time
 * pairing protocol and credential migration have been implemented and tested.
 * This is intentionally not controlled by Vite environment variables: a local
 * .env file must not be able to re-enable the unsafe legacy protocol.
 */
export const RELEASE_FEATURES = Object.freeze({
  cloudSync: false,
});
