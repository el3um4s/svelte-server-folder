<script lang="ts">
  import "./css/tailwind.pcss";

  import { onMount } from "svelte";

  import { SW } from "./sw/serviceWorker";
  import { FolderHandle } from "./sw/folderHandler";
  import { handleFetch } from "./sw/fetchHandler";

  onMount(async () => {
    await SW.register();
  });

  let folderHandle = null;

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

  let hostName = "";
  let swScope = null;
  let clientId = "";
  // SW indicates hosting started OK: get info and display URL
  function onHostStarted(data) {
    hostName = data.hostName;
    swScope = data.scope;
    console.log(data.clientId);
    clientId = data.clientId;
  }
</script>

<main>
  <p>Version: 0.0.3</p>

  <button
    on:click={async () => {
      folderHandle = await FolderHandle.init();
    }}>Load Folder</button
  >

  <div>folderName: {folderHandle?.name}</div>
  <div>clientID: {clientId}</div>
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
