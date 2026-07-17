# MinerU upload relay

Streams a private Backblaze B2 source object into MinerU's signed upload URL.
The source and destination URLs are minted by the Evo worker; the relay never
stores credentials or file bytes.

1. Set `B2_HOST` to the hostname from `B2_ENDPOINT`.
2. Confirm MinerU's signed upload hostname and narrow `MINERU_UPLOAD_HOSTS`.
3. Run `npx wrangler secret put RELAY_TOKEN`.
4. Deploy with `npx wrangler deploy`.
5. Set `MINERU_RELAY_URL` and the same `MINERU_RELAY_TOKEN` on the Python worker.

The caller must stay connected until the streaming PUT finishes. The relay
rejects unknown hosts, missing content lengths, and sources over 10 MiB.
