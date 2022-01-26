import { head, goToUp, h1, li } from "./directoryListeningHelper/elements";
import { style } from "./directoryListeningHelper/style";
// For generating a directory listing page for a folder

export const generateDirectoryListing = async (
  dirHandle: FileSystemDirectoryHandle,
  relativeUrl: string
) => {
  // Display folder with / at end
  if (relativeUrl && !relativeUrl.endsWith("/")) relativeUrl += "/";

  let str = `
<!DOCTYPE html>
<html>
${head(relativeUrl)}

<body>
  <main>
  ${h1(relativeUrl)}

  <div class="list">
  ${goToUp(relativeUrl)}
  ${await li(dirHandle)}
  </div>
  </main>
</body>

${style}

</html>`;

  return new Blob([str], { type: "text/html" });
};
