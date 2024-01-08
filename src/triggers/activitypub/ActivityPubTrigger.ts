import { Item, Trigger } from "../Trigger";
import { TriggerConfig } from "../TriggerConfig";
import { Post } from "./Post";
import { Activity } from "./Activity";
import { ActivityPub } from "./ActivityPub";
import { Actor } from "./Actor";
import { WebFinger } from "./WebFinger";
import { Media } from "../Media";
import { htmlToText } from "html-to-text";
import * as core from "@actions/core";

export interface ActivityPubConfig extends TriggerConfig {
  readonly host?: string;
  readonly user?: string;
  readonly cutoff?: number;
}

type Minutes = number;
const defaultCutoff: Minutes = 30;
const defaultProtocol = "https";

const directRepliesOnlyFor: (actor: Actor) => (activity: Activity) => boolean =
  (actor: Actor) => (activity: Activity) =>
    !activity.object.inReplyTo ||
    (activity.object.inReplyTo.startsWith(actor.self) &&
      !activity.replies.some(
        (reply) =>
          reply.object.inReplyTo &&
          !reply.object.inReplyTo.startsWith(actor.self),
      ));

export class ActivityPubTrigger implements Trigger {
  private readonly config: ActivityPubConfig;

  constructor(config: ActivityPubConfig) {
    this.config = config;
  }

  private isLocalHost(): boolean {
    if (this.config.host) {
      return (
        this.config.host.startsWith("localhost") ||
        this.config.host.startsWith("127.0.0.1")
      );
    }
    return false;
  }

  async run(): Promise<Post[]> {
    if (!this.config.host || !this.config.user) {
      throw new Error(
        `Required config for user [${this.config.user}] or host [${this.config.host}] missing`,
      );
    }

    const protocol = this.isLocalHost() ? "http" : defaultProtocol;
    const serverUrl = new URL(`${protocol}://${this.config.host}`);

    const account = await WebFinger.discover(serverUrl, this.config);

    if (!account) {
      throw new Error(
        `No user found for @${this.config.user}@${this.config.host}`,
      );
    }

    const actor = await ActivityPub.forAccount(account);

    core.info(
      `🔫 retrieving activitypub notes for @${this.config.user}@${this.config.host}`,
    );

    if (!actor) {
      throw new Error(
        `No user found for [@${this.config.user}@${this.config.host}]`,
      );
    }

    const activities = await ActivityPub.activitiesFor(actor);

    const cutoffPeriod: number = this.config.cutoff
      ? this.config.cutoff
      : defaultCutoff;

    const cutoff = new Date(Date.now());
    const adjustment = cutoff.getMinutes() - cutoffPeriod;
    cutoff.setMinutes(adjustment);

    const notes = activities!
      .filter((activity) => activity.type == "Create")
      .filter((activity) => activity.object.type == "Note")
      .filter((activity) => activity.published > cutoff)
      .filter(directRepliesOnlyFor(actor));

    const posts = notes!.map(async (activity) => {
      const text = htmlToText(activity.object.content, {
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

      if (activity.object.attachment) {
        await Media.cache(
          activity.id,
          activity.object.attachment.map((media) => media.url),
        );
      }

      return new Post(
        activity.id,
        text,
        item.inReplyTo,
        activity.object.attachment && activity.object.attachment!.length > 0
          ? activity.id
          : undefined,
      );
    });

    return Promise.all(posts);
  }
}
