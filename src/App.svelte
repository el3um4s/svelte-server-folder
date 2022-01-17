<script lang="ts">
  import "./css/tailwind.pcss";

  import { onMount } from "svelte";

  onMount(async () => {
    await registerSW();
  });

  let folderHandle = null;
  let folderName = "";
  let storage = null;

  // $: console.log(storage);
  async function registerSW() {
    console.log("Registering service worker...");

    try {
      const reg = await navigator.serviceWorker.register("sw.js", {
        scope: "./",
      });
      console.info("Registered service worker on " + reg.scope);
    } catch (err) {
      console.warn("Failed to register service worker: ", err);
    }
  }

  async function InitFolderHandle() {
    await pickFolder();
    folderName = folderHandle.name;
    await waitForSWReady();
    postToSW({
      type: "host-start",
    });
    storage = folderHandle;
  }

  async function pickFolder() {
    folderHandle = await window["showDirectoryPicker"]();
  }

  async function waitForSWReady() {
    // If there is no controller service worker, wait for up to 4 seconds for the Service Worker to complete initialisation.
    if (navigator.serviceWorker && !navigator.serviceWorker.controller) {
      // Create a promise that resolves when the "controllerchange" event fires.
      const controllerChangePromise = new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        })
      );

      // Race with a 4-second timeout.
      const timeout = rejectAfterTimeout(4000, "SW ready timeout");

      await Promise.race([controllerChangePromise, timeout.promise]);

      // Did not reject due to timeout: cancel the rejection to avoid breaking in debugger
      timeout.cancel();
    }
  }

  function rejectAfterTimeout(ms, message) {
    let timeoutId = -1;
    const promise = new Promise((resolve, reject) => {
      timeoutId = self.setTimeout(() => reject(message), ms);
    });
    const cancel = () => self.clearTimeout(timeoutId);
    return { promise, cancel };
  }

  function postToSW(o) {
    navigator.serviceWorker.controller.postMessage(o);
  }

  // Handle messages from SW
  navigator.serviceWorker.addEventListener("message", (e) => {
    switch (e.data.type) {
      case "start-ok":
        onHostStarted(e.data);
        break;
      case "fetch":
        handleFetch(e);
        break;
      default:
        console.warn(`Unknown message from SW '${e.data.type}'`);
        break;
    }
  });

  let hostName = "";
  let swScope = null;
  // SW indicates hosting started OK: get info and display URL
  function onHostStarted(data) {
    hostName = data.hostName;
    swScope = data.scope;
  }

  async function handleFetch(e) {
    try {
      let relativeUrl = decodeURIComponent(e.data.url);

      // Strip trailing / if any, so the last token is the folder/file name
      if (relativeUrl.endsWith("/"))
        relativeUrl = relativeUrl.substr(0, relativeUrl.length - 1);

      // Strip query string if any, since it will cause file name lookups to fail
      const q = relativeUrl.indexOf("?");
      if (q !== -1) relativeUrl = relativeUrl.substr(0, q);

      // Look up through any subfolders in path.
      // Note this uses File System Access API methods, either the real kind or a mini
      // polyfill when using webkitdirectory fallback.
      const subfolderArr = relativeUrl.split("/");
      let curFolderHandle = folderHandle;

      for (
        let i = 0, len = subfolderArr.length - 1 /* skip last */;
        i < len;
        ++i
      ) {
        const subfolder = subfolderArr[i];
        curFolderHandle = await curFolderHandle.getDirectoryHandle(subfolder);
      }

      // Check if the name is a directory or a file
      let file = null;
      const lastName = subfolderArr[subfolderArr.length - 1];
      if (!lastName) {
        // empty name, e.g. for root /, treated as folder
        file = await GenerateDirectoryListing(curFolderHandle, relativeUrl);
      } else {
        try {
          const listHandle = await curFolderHandle.getDirectoryHandle(lastName);
          file = await GenerateDirectoryListing(listHandle, relativeUrl);
        } catch {
          const fileHandle = await curFolderHandle.getFileHandle(lastName);
          file = await fileHandle.getFile();
        }
      }

      // Post file content back to SW down MessageChannel it sent for response
      e.data.port.postMessage({
        type: "ok",
        file,
      });
    } catch (err) {
      console.error(`Unable to serve file '${e.data.url}': `, err);

      e.data.port.postMessage({
        type: "not-found",
      });
    }
  }

  // For generating a directory listing page for a folder
  async function GenerateDirectoryListing(dirHandle, relativeUrl) {
    // Display folder with / at end
    if (relativeUrl && !relativeUrl.endsWith("/")) relativeUrl += "/";

    let str = `<!DOCTYPE html>
	<html><head>
	<meta charset="utf-8">
	<title>Directory listing for ${relativeUrl || "/"}</title>
	</head><body>
	<h1>Directory listing for ${relativeUrl || "/"}</h1><ul>`;

    for await (const [name, handle] of dirHandle.entries()) {
      // Display folders as "name/", otherwise just use name
      const suffix = handle.kind === "directory" ? "/" : "";
      str += `<li><a href="${relativeUrl}${name}">${name}${suffix}</a></li>`;
    }

    str += `</ul></body></html>`;

    return new Blob([str], { type: "text/html" });
  }

  // ADDED 2022-01-13

  async function listAllFilesAndDirs(dirHandle) {
    const files = [];
    for await (let [name, handle] of dirHandle) {
      const { kind } = handle;
      if (handle.kind === "directory") {
        files.push({ name, handle, kind });
        files.push(...(await listAllFilesAndDirs(handle)));
      } else {
        files.push({ name, handle, kind });
      }
    }
    return files;
  }

  async function listAllFiles() {
    try {
      const directoryHandle = await window["showDirectoryPicker"]();
      const files = await listAllFilesAndDirs(directoryHandle);
      console.log("files", files);
    } catch (e) {
      console.log(e);
    }
  }
</script>

<main>
  <p>Version: 0.0.1</p>

  <button
    on:click={async () => {
      await listAllFiles();
    }}>List</button
  >

  <button
    on:click={async () => {
      await InitFolderHandle();
    }}>Load Folder</button
  >

  <div>folderName: {folderName}</div>
  <div><a href="{swScope}{hostName}/">{swScope}{hostName}/</a></div>
</main>

<style lang="postcss">
  a {
    @apply p-1 rounded-lg;
  }

  a:hover {
    border-bottom: 2px;
    background-color: theme("colors.red.600");
    color: theme("colors.gray.300");
  }
</style>
