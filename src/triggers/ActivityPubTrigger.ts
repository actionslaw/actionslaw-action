import { Attachment, Item, Key, Trigger } from "../Trigger";
import { TriggerConfig } from "../TriggerConfig";
import generator, { Entity } from "megalodon";
import { htmlToText } from "html-to-text";
import * as core from "@actions/core";

export class Post implements Item {
  readonly uri: string;
  readonly message: string;
  readonly replyto?: string;
  readonly media?: Attachment[];
  readonly published: Date;
  readonly tags: string;

  constructor(
    uri: string,
    message: string,
    published: Date,
    replyto?: string,
    media?: Attachment[],
    tags?: string[] | undefined,
  ) {
    this.uri = uri;
    this.message = message;
    this.replyto = replyto;
    this.media = media;
    this.published = published;
    this.tags = tags ? JSON.stringify(tags) : "";
  }

  get key(): Key {
    return this.uri as Key;
  }
}

type Status = Entity.Status;

type Minutes = number;

export interface ActivityPubConfig extends TriggerConfig {
  readonly host?: string;
  readonly id?: string;
  readonly cutoff?: Minutes;
  readonly protocol?: string;
  readonly removeTrailingHashtags?: boolean;
}
const defaultCutoff: Minutes = 30;
const defaultProtocol = "https";

function findParentReplies(
  source: Status,
  outbox: Status[],
  accumulator: Status[] = [],
  depth: number = 5,
): Status[] {
  const parent = outbox.filter((post) => post.id === source.in_reply_to_id)[0];

  if (parent && depth > 1)
    return findParentReplies(
      parent,
      outbox,
      accumulator.concat([parent]),
      depth - 1,
    );
  else return accumulator;
}

type StatusFilter = (status: Status) => boolean;

function directRepliesFor(accountId: string, outbox: Status[]): StatusFilter {
  return (status: Status) => {
    const reply = status.in_reply_to_id;
    if (!reply) return true;

    const isAccountOwnerReply = status.in_reply_to_account_id === accountId;

    core.debug(
      `🔫 reply=${status.id} from account ${status.account.id} owned=${isAccountOwnerReply}`,
    );

    const parentReplies = findParentReplies(status, outbox);

    const isIndirectReply = parentReplies.some(
      (reply) =>
        reply.in_reply_to_id && reply.in_reply_to_account_id !== accountId,
    );

    core.debug(
      `🔫 reply=${reply} from account ${status.account.id} indirect=${isIndirectReply}`,
    );

    const include = isAccountOwnerReply && !isIndirectReply;

    core.debug(`🔫 discarding=${!include} ${status.id} (reply to ${reply})`);

    return include;
  };
}

export class ActivityPubTrigger implements Trigger {
  private readonly config: ActivityPubConfig;

  constructor(config: ActivityPubConfig) {
    this.config = config;
  }

  async run(): Promise<Post[]> {
    if (!this.config.host || !this.config.id) {
      throw new Error(
        `Required config for user [${this.config.id}] or host [${this.config.host}] missing`,
      );
    }

    const protocol = this.config.protocol
      ? this.config.protocol
      : defaultProtocol;

    core.info(
      `🔫 retrieving activitypub notes for @${this.config.id}@${this.config.host}`,
    );

    const client = await generator(
      "mastodon",
      `${protocol}://${this.config.host}`,
    );

    const statuses = await client.getAccountStatuses(this.config.id);

    const cutoffPeriod: Minutes = this.config.cutoff
      ? this.config.cutoff
      : defaultCutoff;

    const cutoff = new Date(Date.now());
    const adjustment = cutoff.getMinutes() - cutoffPeriod;
    cutoff.setMinutes(adjustment);

    const notes = statuses.data
      .filter((status) => status.content)
      .filter((status) => new Date(status.created_at) > cutoff)
      .filter(directRepliesFor(this.config.id, statuses.data));

    const posts = notes!.map(async (status) => {
      const text = htmlToText(status.content, {
        wordwrap: false,
        tags: {
          a: {
            options: {
              ignoreHref: true,
            },
          },
        },
      });

      const trailingHashtags = hashtagsMatcher.exec(text);
      const stripHashTags = (t: string) => t.replaceAll(hashtagsMatcher, "");

      const filteredText = this.config.removeTrailingHashtags
        ? stripHashTags(text)
        : text;

      const media: Attachment[] = status.media_attachments.map((status) => {
        return {
          url: status.url,
          alt: status.description,
        };
      });

      return new Post(
        status.id,
        filteredText,
        new Date(status.created_at),
        status.in_reply_to_id ? status.in_reply_to_id : undefined,
        media,
        trailingHashtags
          ? Array.from(trailingHashtags)
              .map((tag) => tag.trim().split(/\s+/))
              .flat()
          : [],
      );
    });

    return Promise.all(posts);
  }
}

const hashtagsMatcher = /(?:\s*[#$][a-z\d-]+)+$/gi;
