export const registerSW = async () => {
  console.log("Registering service worker...");

  try {
    const reg = await navigator.serviceWorker.register("sw.js", {
      scope: "./",
    });
    console.info("Registered service worker on " + reg.scope);
  } catch (err) {
    console.warn("Failed to register service worker: ", err);
  }
};

export const waitForSWReady = async () => {
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
};

function rejectAfterTimeout(ms, message) {
  let timeoutId = -1;
  const promise = new Promise((resolve, reject) => {
    timeoutId = self.setTimeout(() => reject(message), ms);
  });
  const cancel = () => self.clearTimeout(timeoutId);
  return { promise, cancel };
}

const postToSW = (o) => {
  navigator.serviceWorker.controller.postMessage(o);
};

export const SW = {
  register: registerSW,
  waitForReady: waitForSWReady,
  post: postToSW,
};
