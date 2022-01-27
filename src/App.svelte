<script lang="ts">
  import "./css/tailwind.pcss";

  import { onMount } from "svelte";
  import { slide } from "svelte/transition";

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

  let showServerInfo = false;
</script>

<main>
  <section class="folder-handle">
    <header>
      <h1>Svelte Serve Folder</h1>
      <div class="version">Version: 0.0.6</div>
      <div>
        Serve a local folder of files in your browser for easy testing without
        having to run a server.
      </div>
    </header>

    <article>
      <div class="buttons">
        <button
          on:click={async () => {
            folderHandle = await FolderHandle.init();
          }}>Pick Folder</button
        >
        {#if folderHandle}
          <button
            transition:slide
            on:click={() => {
              globalThis.open(`${swScope}${hostName}/`, "_blank");
            }}>Open in new tab</button
          >
        {/if}
      </div>

      {#if folderHandle}
        <div class="server-information">
          <div
            on:click={() => (showServerInfo = !showServerInfo)}
            style:cursor="pointer"
          >
            Server Information
          </div>
          {#if showServerInfo}
            <div class="handled" transition:slide>
              <div>folderName</div>
              <div>{folderHandle?.name}</div>
              <div>clientID</div>
              <div>{clientId}</div>
              <div>swScope</div>
              <div>{swScope}</div>
              <div>hostName</div>
              <div>{hostName}</div>
            </div>
          {/if}
        </div>
      {/if}
    </article>
  </section>
</main>

<style lang="postcss">
  .folder-handle {
    @apply w-96 max-w-sm border p-2 rounded drop-shadow-lg;
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

  .server-information {
    margin: 8px;
  }
  .handled {
    margin-top: 8px;
    display: grid;
    grid-template-columns: min-content auto;
    align-items: normal;
    justify-items: stretch;
  }

  .handled > div {
    border-bottom: 1px solid #dfcdc3;
    padding: 4px;
  }
</style>
