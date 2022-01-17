/// <reference path="../node_modules/svelte/types/runtime/index.d.ts" />
import App from "./App.svelte";

const app = new App({
  target: document.body,
});

export default app;

// see this: https://github.com/sveltejs/template/issues/270#issuecomment-973031514
// problem with typescript 4.5
