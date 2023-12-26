import { Item, Trigger } from "../Trigger";
import { TriggerConfig } from "../TriggerConfig";
import { Post } from "./Post";
import { Activity } from "./Activity";
import { ActivityPub } from "./ActivityPub";
import { Actor } from "./Actor";
import { WebFinger } from "./WebFinger";
import { htmlToText } from "html-to-text";

interface ActivityPubConfig {
  readonly host?: string;
  readonly user?: string;
  readonly cutoff?: number;
}

type Minutes = number;
const defaultCutoff: Minutes = 30;

const directRepliesOnlyFor: (actor: Actor) => (activity: Activity) => boolean =
  (actor: Actor) => (activity: Activity) =>
    !activity.object.inReplyTo ||
    (activity.cc.length === 1 &&
      activity.cc.includes(`${actor.self}/followers`));

export class ActivityPubTrigger implements Trigger {
  private readonly config: ActivityPubConfig;

  constructor(config: TriggerConfig) {
    this.config = config as ActivityPubConfig;
  }

  async run(): Promise<Item[]> {
    if (this.config.host && this.config.user) {
      const account = await WebFinger.discover(
        this.config.host,
        this.config.user,
      );

      const actor = await ActivityPub.forAccount(account);
      const cutoffPeriod: number = this.config.cutoff
        ? this.config.cutoff
        : defaultCutoff;

      if (actor) {
        const activities = await ActivityPub.activitiesFor(actor);

        const cutoff = new Date(Date.now());
        const adjustment = cutoff.getMinutes() - cutoffPeriod;
        cutoff.setMinutes(adjustment);

        const notes = activities!
          .filter((activity) => activity.type == "Create")
          .filter((activity) => activity.object.type == "Note")
          .filter((activity) => activity.published > cutoff)
          .filter(directRepliesOnlyFor(actor));

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
          const item = activity.object;

          return new Post(activity.id, text, item.inReplyTo);
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
