// Install & activate
self.addEventListener("install", e => {
    console.log("[SW] install");

    // Skip waiting to ensure files can be served on first run. Also save all files to
    // the offline cache for offline support on install.
    // e.waitUntil(Promise.all([
    //     self.skipWaiting(),
    //     SaveFilesToOfflineCache()
    // ]));
});

self.addEventListener("activate", event => {
    console.log("[SW] activate");

    // On activation, claim all clients so we can start serving files on first run
    // event.waitUntil(clients.claim());
});

// Listen for messages from clients
self.addEventListener("message", e => {
    console.log(`The client sent me a message`, e.data);

    switch (e.data.type) {
        case "host-start":
            e.waitUntil(StartHost(e));
            break;
            // case "host-stop":
            //     e.waitUntil(StopHost(e));
            //     break;
        default:
            console.warn(`[SW] Unknown message '${e.data.type}'`);
            break;
    }
});


let clientIdTemp = null;

// Client wants to start hosting
async function StartHost(e) {
    const hostName = "host";
    const clientId = e.source.id;
    clientIdTemp = clientId;

    // Tell client it's now hosting.
    e.source.postMessage({
        type: "start-ok",
        hostName,
        clientId,
        scope: self.registration.scope
    });
}


// Main fetch event
self.addEventListener("fetch", e => {
    // Request to different origin: pass-through
    if (new URL(e.request.url).origin !== location.origin)
        return;

    // Check request in SW scope - should always be the case but check anyway
    const swScope = self.registration.scope;
    if (!e.request.url.startsWith(swScope))
        return;

    // Check this is a host URL, e.g. "host/", "host2/"...
    const scopeRelativeUrl = e.request.url.substr(swScope.length);
    const scopeUrlMatch = /^host\d*\//.exec(scopeRelativeUrl);
    if (!scopeUrlMatch) {
        // Not part of a host URL. Try respond using offline cache if possible.
        // e.respondWith(OfflineFetch(e.request));
        return;
    }

    // Strip host name from URL and get the URL within the host
    const hostUrl = scopeUrlMatch[0];
    const hostName = hostUrl.substr(0, hostUrl.length - 1);
    const hostRelativeUrl = scopeRelativeUrl.substr(hostUrl.length);

    e.respondWith(HostFetch(hostName, hostRelativeUrl));
});

async function HostFetch(hostName, url) {
    // Look up client from the host name.
    const clientId = clientIdTemp;
    if (!clientId)
        return;

    const client = await self.clients.get(clientId);
    if (!client)
        return;

    // Create a MessageChannel for the client to send a reply.
    // Wrap it in a promise so the response can be awaited.
    const messageChannel = new MessageChannel();
    const responsePromise = new Promise((resolve, reject) => {
        messageChannel.port1.onmessage = (e => {
            if (e.data.type === "ok")
                resolve(e.data.file);
            else
                reject();
        });
    });

    // Post to the client to ask it to provide this file.
    client.postMessage({
        type: "fetch",
        url,
        port: messageChannel.port2
    }, [messageChannel.port2]);

    try {
        // Wait for the client to reply, and then serve the file it provided.
        // Note ensure caching is disabled; we want to make sure every request
        // is re-loaded from disk.
        const file = await responsePromise;
        return new Response(file, {
            status: 200,
            statusText: "OK",
            headers: {
                "Cache-Control": "no-store"
            }
        });
    } catch (err) {
        return;
        // return FetchFailedResponse(hostName, url);
    }
}