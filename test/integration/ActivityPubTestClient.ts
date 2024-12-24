import { Attachment } from "../../src/Trigger";

interface TestObject {
  object: {
    readonly id?: string;
    readonly type: string;
    readonly content: string;
    readonly in_reply_to_id?: string;
    readonly attachment?: [{ readonly url: string }];
  };
}

interface TestPost {
  readonly contents: TestObject;
}

interface CreatePostOptions {
  readonly reply?: string;
  readonly replyAccountId?: string;
  readonly attachment?: Attachment;
}

export class ActivityPubTestClient {
  private readonly endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async createPost(
    message: string,
    options?: CreatePostOptions,
  ): Promise<TestPost> {
    function replyTo(reply: string, post: TestObject): TestObject {
      const object = Object.assign(post.object, {
        in_reply_to_id: reply,
        in_reply_to_account_id: options ? options.replyAccountId : undefined,
      });

      return { object: object };
    }

    function attachment(attachment: Attachment, post: TestObject): TestObject {
      const object = Object.assign(post.object, {
        media_attachments: [
          { url: attachment.url, description: attachment.alt },
        ],
      });
      return { object: object };
    }

    const post: TestObject = {
      object: {
        type: "Note",
        content: message,
      },
    };

    const postWithReply =
      options && options.reply ? replyTo(options.reply, post) : post;

    const postWithReplyWithAttachment =
      options && options.attachment
        ? attachment(options.attachment, postWithReply)
        : postWithReply;

    const response = await fetch(`${this.endpoint}/admin/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postWithReplyWithAttachment),
    });

    const text = await response.text();
    return JSON.parse(text) as TestPost;
  }
}
