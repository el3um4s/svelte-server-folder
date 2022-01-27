<script lang="ts">
  import "./css/tailwind.pcss";

  import { onMount } from "svelte";

  import { SW } from "./sw/serviceWorker";
  import { FolderHandle } from "./sw/folderHandler";
  import { handleFetch } from "./sw/fetchHandler";

  let folderHandle = null;
  let hostName = "";
  let swScope = null;
  let clientId = "";

  onMount(async () => {
    await SW.register();
  });

  window.addEventListener("unload", () => {
    SW.post({
      type: "host-stop",
      hostName,
    });
  });

  // Handle messages from SW
  navigator.serviceWorker.addEventListener("message", (e) => {
    switch (e.data.type) {
      case "start-ok":
        onHostStarted(e.data);
        break;
      case "fetch":
        handleFetch(folderHandle, e);
        break;
      default:
        console.warn(`Unknown message from SW '${e.data.type}'`);
        break;
    }
  });

  // SW indicates hosting started OK: get info and display URL
  function onHostStarted(data) {
    hostName = data.hostName;
    swScope = data.scope;
    clientId = data.clientId;
  }
</script>

<main>
  <section class="folder-handle">
    <header>
      <h1>Svelte Serve Folder</h1>
      <div class="version">Version: 0.0.5</div>
      <div>
        Serve a local folder of files in your browser for easy testing without
        having to run a server.
      </div>
    </header>

    <article>
      <button
        on:click={async () => {
          folderHandle = await FolderHandle.init();
        }}>Pick Folder</button
      >

      <div>folderName: {folderHandle?.name}</div>
      <div>clientID: {clientId}</div>
      <div>swScope: {swScope}</div>
      <div>hostName: {hostName}</div>
      <button
        on:click={() => {
          globalThis.open(`${swScope}${hostName}/`, "_blank");
        }}>Open in new tab</button
      >
    </article>
  </section>
</main>

<style lang="postcss">
  /* main {
    --background-color: #f5f5f5;
    --color: #333242;
    --hover-background-color: #dcb454;
    --hover-color: #1f6435;
  } */
  .folder-handle {
    @apply w-96 max-w-sm border p-2 rounded;
    background-color: #fff7ed;
    --hover-background-color: #dfcdc3;
    border-color: var(--color);
  }

  header,
  article {
    @apply p-2;
  }

  header {
    @apply mb-4;
    border-bottom: 2px solid #dfcdc3;
  }
  .version {
    @apply text-sm;
  }
</style>
