import { folder, file, goUp, index } from "./icons";

export const head = (relativeUrl: string) => {
  return `<head>
	<meta charset="utf-8">
	<title>Directory listing for ${relativeUrl || "/"}</title>
</head>`;
};

export const goToUp = (relativeUrl: string) => {
  return (relativeUrl || "/") != "/"
    ? `<div class="item go-up"><div class="icon">${goUp}</div><div class="link"><a href="../">../</a></div></div>`
    : "";
};

export const h1 = (relativeUrl: string) => {
  return `<h1>Directory listing for ${relativeUrl || "/"}</h1>`;
};

export const li = async (dirHandle: FileSystemDirectoryHandle) => {
  let str = "";
  for await (const [name, handle] of dirHandle.entries()) {
    // Display folders as "name/", otherwise just use name
    const suffix = handle.kind === "directory" ? "/" : "";
    const isIndex = name.toLowerCase() === "index.html";
    const icon = handle.kind === "directory" ? folder : isIndex ? index : file;
    str += `<div class="item ${
      isIndex ? "index" : ""
    }"><div class="icon">${icon}</div><div class="link"><a href="${name}${suffix}">${name}${suffix}</a></div></div>`;
  }
  return str;
};
