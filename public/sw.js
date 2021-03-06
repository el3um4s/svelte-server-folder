let storeHosts = [];

const storageDelete = (hostName) => {
  storeHosts = storeHosts.filter(host => host.hostName !== hostName);
}

const storageGetClientId = (hostName) => {
  return storeHosts.find(host => host.hostName === hostName);
}

const storageClear = () => {
  storeHosts = [];
}

const storageLength = () => storeHosts.length;

// Install & activate
self.addEventListener("install", (e) => {
  console.log("[SW] install");

  // Skip waiting to ensure files can be served on first run. Also save all files to
  // the offline cache for offline support on install.
  e.waitUntil(Promise.all([
    self.skipWaiting(),
    // SaveFilesToOfflineCache()
  ]));
});

self.addEventListener("activate", (event) => {
  console.log("[SW] activate");

  // On activation, claim all clients so we can start serving files on first run
  event.waitUntil(clients.claim());
});

// Listen for messages from clients
self.addEventListener("message", (e) => {
  console.log(`The client sent me a message`, e.data);

  switch (e.data.type) {
    case "host-start":
      e.waitUntil(StartHost(e));
      break;
    case "host-stop":
      e.waitUntil(StopHost(e));
      break;
    default:
      console.warn(`[SW] Unknown message '${e.data.type}'`);
      break;
  }
});



// Client wants to start hosting
async function StartHost(e) {

  const allClients = await self.clients.matchAll();

  if (allClients.length <= 1) {
    storageClear();
  }

  const hostKeys = storageLength();
  const hostName = `host${hostKeys+1}`;
  const clientId = e.source.id;

  storeHosts.push({
    hostName,
    clientId
  })
  console.log("storeHosts", storeHosts);
  // Tell client it's now hosting.
  e.source.postMessage({
    type: "start-ok",
    hostName,
    clientId,
    scope: self.registration.scope,
  });
}

async function StopHost(e) {
  storageDelete(e.data.hostName);
}


// Main fetch event
self.addEventListener("fetch", (e) => {
  // Request to different origin: pass-through
  if (new URL(e.request.url).origin !== location.origin) return;

  // Check request in SW scope - should always be the case but check anyway
  const swScope = self.registration.scope;
  if (!e.request.url.startsWith(swScope)) return;

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
  const clientId = storageGetClientId(hostName);
  if (!clientId) return HostNotFoundResponse(hostName);

  console.log("HostFetch", clientId);
  const client = await self.clients.get(clientId.clientId);
  if (!client) return ClientNotFoundResponse(hostName);

  // Create a MessageChannel for the client to send a reply.
  // Wrap it in a promise so the response can be awaited.
  const messageChannel = new MessageChannel();
  const responsePromise = new Promise((resolve, reject) => {
    messageChannel.port1.onmessage = (e) => {
      if (e.data.type === "ok") resolve(e.data.file);
      else reject();
    };
  });

  // Post to the client to ask it to provide this file.
  client.postMessage({
      type: "fetch",
      url,
      port: messageChannel.port2,
    },
    [messageChannel.port2]
  );

  try {
    // Wait for the client to reply, and then serve the file it provided.
    // Note ensure caching is disabled; we want to make sure every request
    // is re-loaded from disk.
    const file = await responsePromise;
    return new Response(file, {
      status: 200,
      statusText: "OK",
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    // return;
    return FetchFailedResponse(hostName, url);
  }
}

// Error responses
function HostNotFoundResponse(hostName) {
  return new Response(`<h1>Host not found</h1><p>The host '<em>${hostName}</em>' does not appear to be running. Make sure you have chosen a folder to serve. Alternatively you might have closed the host's browser tab.</p>`, {
    status: 404,
    statusText: "Not Found",
    headers: {
      "Content-Type": "text/html"
    }
  });
}

function ClientNotFoundResponse(hostName) {
  return new Response(`<h1>Client not found</h1><p>A client for the host '<em>${hostName}</em>' does not appear to be running. You might have closed its browser tab.</p>`, {
    status: 404,
    statusText: "Not Found",
    headers: {
      "Content-Type": "text/html"
    }
  });
}

function FetchFailedResponse(hostName, url) {
  return new Response(`<h1>File not found</h1><p>The host '<em>${hostName}</em>' was not able to return a file for the path '<em>${url}</em>'. Check the file exists in the folder you chose to serve.`, {
    status: 404,
    statusText: "Not Found",
    headers: {
      "Content-Type": "text/html"
    }
  });
}