// The blogs module's addresses: the /blogs page and the list it reads.
import { defineModule } from "@aihot/contracts/modules";

export const blogsModule = defineModule({
  name: "blogs",
  pages: [{ path: "blogs", file: "web/page.tsx", id: "blogs" }],
  apiPaths: [/^\/api\/blogs$/],
});
