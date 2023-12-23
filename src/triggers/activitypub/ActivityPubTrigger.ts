import { Item, Trigger } from "../Trigger";
import { Post } from "./Post";
import { ActivityPub } from "./ActivityPub";
import { WebFinger } from "./WebFinger";
import { htmlToText } from "html-to-text";

interface ActivityPubConfig {
  readonly host?: string;
  readonly user?: string;
}

type Minutes = number;
const cutoffPeriod: Minutes = 30;

export class ActivityPubTrigger implements Trigger {
  private readonly config: ActivityPubConfig;

  constructor(config: [string, string][]) {
    this.config = config as ActivityPubConfig;
  }

  async run(): Promise<Item[]> {
    if (this.config.host && this.config.user) {
      const account = await WebFinger.discover(
        this.config.host,
        this.config.user,
      );

      const actor = await ActivityPub.forAccount(account);

      if (actor) {
        const activities = await ActivityPub.activitiesFor(actor);

        const cutoff = new Date(Date.now());
        const adjustment = cutoff.getMinutes() - cutoffPeriod;
        cutoff.setMinutes(adjustment);

        const notes = activities!
          .filter((activity) => activity.type == "Create")
          .filter((activity) => activity.object.type == "Note")
          .filter((activity) => activity.published > cutoff);

        const posts = notes!.map((activity) => {
          const text = htmlToText(activity.object.contentMap.en, {
            wordwrap: false,
            tags: {
              a: {
                options: {
                  hideLinkHrefIfSameAsText: true,
                },
              },
            },
          });

          return new Post(activity.id, text);
        });

        return posts;
      } else {
        throw new Error(
          `No user found for [@${this.config.user}@${this.config.host}]`,
        );
      }
    } else {
      throw new Error(
        `Required config for user [${this.config.user}] or host [${this.config.host}] missing`,
      );
    }
  }
}
