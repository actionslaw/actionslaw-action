import * as fs from "fs";
import { Readable } from "stream";
import { finished } from "stream/promises";
import * as path from "path";
import { URL } from "url";
import * as cache from "@actions/cache";
import * as core from "@actions/core";
import { Attachment } from "./Trigger";

export class Media {
  static folder: string = "./media";

  private static async download(
    key: string,
    attachments: Attachment[],
  ): Promise<string[]> {
    return Promise.all(
      attachments.map(async (attachment) => {
        const mediaUrl = new URL(attachment.url);
        const media = await fetch(mediaUrl);
        const folder = `${Media.folder}/${key}`;

        if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

        const fileName = path.basename(mediaUrl.pathname);
        const mediaFile = path.resolve(folder, fileName);
        const fileStream = fs.createWriteStream(mediaFile, { flags: "w" });

        if (media.body) {
          await finished(Readable.fromWeb(media.body).pipe(fileStream));
        }

        if (media.body && attachment.alt) {
          fs.writeFileSync(`${mediaFile}.txt`, attachment.alt);
        }

        return mediaFile;
      }),
    );
  }

  static async cache(key: string, attachments: Attachment[]): Promise<void> {
    if (attachments.length > 0) {
      const files = await Media.download(key, attachments);

      core.info(`🔫 caching media ${files} for key ${key}`);

      await cache.saveCache([`${Media.folder}/**`], key);
      fs.rmSync(Media.folder, { recursive: true, force: true });
    }
  }
}
