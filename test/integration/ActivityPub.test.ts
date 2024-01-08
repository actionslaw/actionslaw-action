import { describe, expect, test } from "@jest/globals";
import * as crypto from "crypto";
import { ActivityPubApp } from "activitypub-starter-kit.rg-wood";
import { ActivityPubTrigger } from "../../src/triggers/activitypub/ActivityPubTrigger";

const user = "test";
const hostname = "localhost";
const port = "8000";
const host = `${hostname}:${port}`;

const app = new ActivityPubApp(
  user,
  "http",
  host,
  port,
  "./database.sqlite3",
  "./node_modules/activitypub-starter-kit.rg-wood/db/schema.sql",
  "",
  "",
);

app.start();

const trigger = new ActivityPubTrigger({
  host: host,
  user: user,
  protocol: "http",
});

interface TestObject {
  object: {
    id?: string;
    type: string;
    content: string;
    inReplyTo?: string;
  };
}

interface TestPost {
  contents: TestObject;
}

function replyTo(reply: string, message: string): TestObject {
  return {
    object: {
      type: "Note",
      content: message,
      inReplyTo: reply,
    },
  };
}

async function createPost(message: string, reply?: string): Promise<TestPost> {
  const post: TestObject = {
    object: {
      type: "Note",
      content: message,
    },
  };

  const body = reply ? replyTo(reply, message) : post;

  const response = await fetch(`http://${host}/admin/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  return JSON.parse(text) as TestPost;
}

describe("ActivityPub", () => {
  test("read ActivityPub posts", async () => {
    const uuid = crypto.randomUUID();
    await createPost(`<p>${uuid}</p>`);

    const posts = await trigger.run();

    expect(posts.find((post) => post.message === uuid)).toBeTruthy();
  });

  test("read ActivityPub posts with URL", async () => {
    const url = `https://example.org/${crypto.randomUUID()}`;
    await createPost(`<p><a href=${url}>${url}</a></p>`);

    const posts = await trigger.run();

    expect(posts.find((post) => post.message === url)).toBeTruthy();
  });

  test("read ActivityPub replies", async () => {
    const uuid = crypto.randomUUID();
    const post = await createPost("test-post");
    await createPost(uuid, post.contents.object.id);

    const posts = await trigger.run();

    expect(
      posts.find((p) => p.replyto === post.contents.object.inReplyTo),
    ).toBeTruthy();
  });

  test("ignore indirect ActivityPub replies", async () => {
    const uuid = crypto.randomUUID();
    await createPost(uuid, `https://example.org/test/${uuid}`);

    const posts = await trigger.run();

    expect(!posts.find((post) => post.message === uuid)).toBeTruthy();
  });

  test("ignore ActivityPub reply to indirect reply", async () => {
    const uuid1 = crypto.randomUUID();
    const indirectReply = await createPost(
      uuid1,
      `https://example.org/test/${uuid1}`,
    );
    const uuid2 = crypto.randomUUID();
    await createPost(uuid2, indirectReply.contents.object.id);

    const posts = await trigger.run();

    expect(!posts.find((post) => post.message === uuid2)).toBeTruthy();
  });

  test("ignore ActivityPub reply to reply to indirect reply", async () => {
    const uuid1 = crypto.randomUUID();
    const indirectReply = await createPost(
      uuid1,
      `https://example.org/test/${uuid1}`,
    );

    const uuid2 = crypto.randomUUID();
    const indirectReplyReply = await createPost(
      uuid2,
      indirectReply.contents.object.id,
    );

    const uuid3 = crypto.randomUUID();
    await createPost(uuid3, indirectReplyReply.contents.object.id);

    const posts = await trigger.run();

    expect(!posts.find((post) => post.message === uuid3)).toBeTruthy();
  });
});

afterAll(() => {
  return app.stop();
});
