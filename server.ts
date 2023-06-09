type RequestBody = {
  url: string;
};

import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { Application } from "https://deno.land/x/oak@v12.4.0/mod.ts";
import { Router } from "https://deno.land/x/oak@v12.4.0/mod.ts";
import { encodeUrl } from "https://deno.land/x/oak@v12.4.0/util.ts";
import { httpErrors } from "https://deno.land/x/oak@v12.4.0/mod.ts";

import {
  getBasicInfo,
  ytdl,
} from "https://deno.land/x/ytdl_core@v0.1.2/mod.ts";

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

router.post("/v2/download", async (context) => {
  const result = context.request.body();

  if (result.type !== "json") {
    throw new httpErrors.BadRequest("URL must be provided");
  }

  const value: RequestBody = await result.value;

  const basicInfo = await getBasicInfo(value.url);
  const stream = await ytdl(value.url, {
    quality: "highestaudio",
  });

  const disposition = `attachment; filename="${encodeUrl(
    basicInfo.videoDetails.title
  )}.mp3"`;
  context.response.headers.set("Content-Disposition", disposition);
  // context.response.headers.set("Content-Length", blob.size.toString());
  context.response.headers.set("Content-Transfer-Encoding", "binary");
  context.response.status = 200;
  context.response.type = "audio/mpeg";
  context.response.body = stream;
});

router.post("/v1/download", async (context) => {
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
      quality: "highestaudio",
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
    origin: ["https://download-song.vercel.app", "http://localhost:3000"],
    exposedHeaders: [
      "Content-Disposition",
      "Content-Length",
      "Content-Transfer-Encoding",
    ],
  })
);

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 8080 });
