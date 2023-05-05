type RequestBody = {
  url: string;
};
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import { Application } from "https://deno.land/x/oak/mod.ts";
import { Router } from "https://deno.land/x/oak@v12.4.0/mod.ts";
import { encodeUrl } from "https://deno.land/x/oak@v12.4.0/util.ts";
import { httpErrors } from "https://deno.land/x/oak@v12.4.0/mod.ts";

import {
  getBasicInfo,
  validateURL,
  ytdl,
} from "https://deno.land/x/ytdl_core/mod.ts";

const router = new Router();

router.use(async (context, next) => {
  await next();
  const rt = context.response.headers.get("X-Response-Time");
  console.log(`${context.request.method} ${context.request.url} - ${rt}`);
});

router.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set("X-Response-Time", `${ms}ms`);
});

router.get("/", (context) => (context.response.body = "Hello World"));

router.post("/download", async (context) => {
  if (!context.request.hasBody) {
    throw new httpErrors.BadRequest("URL must be provided");
  }

  const result = context.request.body();

  if (result.type !== "json") {
    throw new httpErrors.BadRequest("URL must be provided");
  }

  const value: RequestBody = await result.value;

  try {
    const videoInfo = await getBasicInfo(value.url);
    const audio = await ytdl(value.url, {
      filter: "audioonly",
    });
    // Set response headers
    context.response.status = 200;
    context.response.type = "audio/mpeg";
    const disposition = `attachment; filename="${encodeUrl(
      videoInfo.videoDetails.title
    )}.mp3"`;

    context.response.headers.set("Content-Disposition", disposition);

    // Pipe the video stream to the response
    context.response.body = audio;
  } catch (_e) {
    throw new httpErrors.BadRequest("Invalid YouTube URL");
  }
});

const app = new Application();

app.use(
  oakCors({
    // TODO: add the origin of the website
    origin: ["https://download-song.vercel.app"],
    exposedHeaders: "Content-Disposition",
  })
);

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 8080 });
