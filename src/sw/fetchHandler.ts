import { generateDirectoryListing } from "./directoryListening";

export const handleFetch = async (
  folderHandle: FileSystemDirectoryHandle,
  e: MessageEvent<any>
) => {
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
      file = await generateDirectoryListing(curFolderHandle, relativeUrl);
    } else {
      try {
        const listHandle = await curFolderHandle.getDirectoryHandle(lastName);
        file = await generateDirectoryListing(listHandle, relativeUrl);
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
};
