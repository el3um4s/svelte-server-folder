import { SW } from "./serviceWorker";

const pickFolder = async (): Promise<FileSystemDirectoryHandle> => {
  const folderHandle: FileSystemDirectoryHandle = await window[
    "showDirectoryPicker"
  ]();
  return folderHandle;
};

const init = async (): Promise<FileSystemDirectoryHandle> => {
  const folderHandle: FileSystemDirectoryHandle = await pickFolder();
  await SW.waitForReady();
  SW.post({
    type: "host-start",
  });
  return folderHandle;
};

export const FolderHandle = {
  init,
};
