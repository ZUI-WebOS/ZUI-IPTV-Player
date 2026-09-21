# Cloud Sync security status

## Version 1.0.1

Cloud Sync is intentionally unavailable in the public 1.0.1 build while its
pairing, authorization and credential-transfer design is being replaced.

The release includes defense-in-depth application gates:

- Cloud Sync entry points are removed from onboarding and settings.
- The application does not start the legacy Supabase listener.
- Runtime and configuration layers refuse to create a Cloud Sync client.
- Local environment variables or old local settings cannot re-enable it.
- Direct M3U URL and Xtream Codes entry remain available.

The Home screen still contains the non-interactive legacy subtitle
`M3U · Xtream · Cloud`. This is a known cosmetic label only; it does not enable
or connect the feature.

The legacy Production service has also been placed behind a restrictive
server-side lock and removed from Realtime publication. The project does not
claim that unauthorized exploitation occurred; the earlier exposure window is
treated as a security risk while evidence remains incomplete.

Cloud Sync v2 is not part of 1.0.1. It will require a separately reviewed,
server-authorized pairing protocol, protected credential handling, migration
and real-device acceptance before it can be enabled again.

Do not post playlist URLs, Xtream usernames/passwords, API keys, device secrets
or database details in a public issue. A security report should contain only
sanitized reproduction information until a private reporting channel is agreed.
