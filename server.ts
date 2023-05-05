type RequestBody = {
  url: string;
};
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import { Application } from "https://deno.land/x/oak/mod.ts";
import { Router } from "https://deno.land/x/oak@v12.4.0/mod.ts";
import { encodeUrl } from "https://deno.land/x/oak@v12.4.0/util.ts";
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
    return;
  }

  const result = context.request.body();

  if (result.type === "json") {
    const value: RequestBody = await result.value; // an object of parsed JSON
    if (validateURL(value.url)) {
      console.log(value.url);

      // Find the video format with the highest quality
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
      //   return new Response(audio);
      context.response.body = audio;
    }
  }
});

const app = new Application();

app.use(
  oakCors({
    // TODO: add the origin of the website
    origin: ["https://download-song.vercel.app/", "http://localhost:3000"],
    exposedHeaders: "Content-Disposition",
  })
);

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 8080 });
