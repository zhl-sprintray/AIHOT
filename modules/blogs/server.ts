// The blogs module's backend: the list the /blogs page reads.
import { defineServerModule } from "@aihot/backend/modules";
import { InvalidCursorError } from "@aihot/backend/lib/cursor";
import { QueryError, sendJsonWithEtag, sendProblem, strictQuery } from "@aihot/api/http/respond";
import { loadBlogs, MAX_LIMIT, UnknownOrgError } from "./backend/list.ts";

function parse(q: Record<string, string>) {
  const orgs = q.org === undefined ? [] : q.org.split(",");
  if (orgs.some((o) => !o)) throw new QueryError("org must be company keys separated by commas.");
  if (q.hot !== undefined && q.hot !== "1") throw new QueryError("hot must be 1.");
  const limit = q.limit === undefined ? 30 : Number(q.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) throw new QueryError(`limit must be 1 to ${MAX_LIMIT}.`);
  return { orgs, hot: q.hot === "1", cursor: q.cursor ?? null, limit };
}

export const blogsServer = defineServerModule({
  name: "blogs",
  http(app) {
    app.get("/api/blogs", async (req, reply) => {
      try {
        const body = await loadBlogs(parse(strictQuery(req, ["org", "hot", "cursor", "limit"])));
        return sendJsonWithEtag(req, reply, body, { etagPrefix: "blogs", cacheControl: "public, max-age=60, s-maxage=60" });
      } catch (error) {
        if (error instanceof QueryError || error instanceof UnknownOrgError || error instanceof InvalidCursorError) {
          return sendProblem(req, reply, { status: 400, code: "invalid_request", detail: error.message });
        }
        req.log.error({ err: error }, "blogs api error");
        return sendProblem(req, reply, { status: 503, code: "temporarily_unavailable", detail: "temporarily unavailable", retryAfter: 10 });
      }
    });
  },
});
