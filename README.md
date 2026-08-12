# SAMBUT R0 frontend

Next.js staff and user terminals for the server-authoritative SAMBUT R0 workflow.

## Run and verify

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev -- --hostname 127.0.0.1 --port 3000
npm run lint
npx tsc --noEmit
npm test
npm run build
```

`NEXT_PUBLIC_SAMBUT_API_URL` must point to the FastAPI P7B branch. Staff uses `/staff` to create a session; the user opens `/user` in an independent browser context and enters the session ID and join code.

The browser keeps role credentials only in tab-scoped `sessionStorage` to support refresh during the demo. Authoritative state always comes from REST/WebSocket snapshots. Closing the tab clears the credentials; local storage and BroadcastChannel are not used for correctness.

Camera access starts only after the user chooses the BISINDO response path. The runtime captures 30 real JPEG frames from the live stream, stops every MediaStream track after capture/cancel/unmount, and sends frames to the backend preprocessing adapter. It never generates landmarks or substitutes a semantic result when AI is unavailable.
