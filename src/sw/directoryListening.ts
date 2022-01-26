// For generating a directory listing page for a folder
export const generateDirectoryListing = async (
  dirHandle: FileSystemDirectoryHandle,
  relativeUrl: string
) => {
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
    str += `<li><a href="${name}${suffix}">${name}${suffix}</a></li>`;
  }

  str += `</ul></body></html>`;

  return new Blob([str], { type: "text/html" });
};
