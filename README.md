# AI Image Generator starter

A one-page text-to-image app you can deploy in a minute: a prompt box, three aspect ratios, and the
finished picture. One file of server code, no dependencies, Node 18+.

Images come from the [Kavel](https://www.kavel.ai/?utm_source=github&utm_medium=starter) HTTP API.

## Run it

```bash
node server.js          # http://localhost:3000
```

It works with nothing configured: without a key it runs on Kavel's free anonymous tier
(watermarked, and the free credits run out after a couple of images a day per server IP).

| Variable | What it does |
|---|---|
| `KAVEL_API_KEY` | Runs on your own Kavel account instead of the free tier. Create one at [kavel.ai/settings/apikeys](https://www.kavel.ai/settings/apikeys?utm_source=github&utm_medium=starter). |
| `KAVEL_MODEL` | Model to run with a key. Default `kavel-image-v1`. The models your plan includes are listed on the [pricing page](https://www.kavel.ai/pricing?utm_source=github&utm_medium=starter). |
| `PORT` | Port to listen on. Default `3000`. |

Or run the prebuilt image: `docker run -p 3000:3000 san8888/kavel-image-starter` (amd64 and arm64).

## How it works

- `POST /api/generate` submits the prompt and returns a task id.
- `GET /api/status?id=` polls it. A free job waits in a queue and only starts when it is polled,
  so the page keeps polling until the image is ready (usually under a minute).
- Running out of credits comes back as HTTP 200 with `data.wall: true`, not as an error status;
  the server turns that into a readable message.

API reference: [kavel.readthedocs.io](https://kavel.readthedocs.io/). Want photo edits instead of
text-to-image? The [Kavel image studio](https://www.kavel.ai/image?utm_source=github&utm_medium=starter)
has the edit tools (hairstyle, outfit, old photo restoration and more), and for people shots that need
the whole figure in frame there is a [full body AI generator](https://www.kavel.ai/image/ai-full-body-generator?utm_source=github&utm_medium=starter).

## License

MIT
