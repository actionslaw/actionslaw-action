import { describe, expect, test } from "@jest/globals";
import * as crypto from "crypto";
import { ActivityPubApp } from "activitypub-starter-kit.rg-wood";
import { ActivityPubTestClient } from "./ActivityPubTestClient";
import { ActivityPubTrigger } from "../../src/triggers/activitypub/ActivityPubTrigger";
import { Post } from "../../src/triggers/activitypub/Post";

const app = ActivityPubApp.testApp();

app.start();

const testClient = new ActivityPubTestClient(`${app.protocol}://${app.host}`);

describe("ActivityPub should", () => {
  test("read ActivityPub posts", async () => {
    const uuid = crypto.randomUUID();
    await testClient.createPost(`<p>${uuid}</p>`);

    const trigger = new ActivityPubTrigger({
      host: app.host,
      user: app.account,
      protocol: app.protocol,
    });

    const posts = await trigger.run();

    expect(posts.find((post) => post.message === uuid)).toBeTruthy();
  });

  test("read ActivityPub posts with URL", async () => {
    const url = `https://example.org/${crypto.randomUUID()}`;
    await testClient.createPost(`<p><a href=${url}>${url}</a></p>`);

    const trigger = new ActivityPubTrigger({
      host: app.host,
      user: app.account,
      protocol: app.protocol,
    });

    const posts = await trigger.run();

    expect(posts.find((post) => post.message === url)).toBeTruthy();
  });

  test("read ActivityPub replies", async () => {
    const uuid = crypto.randomUUID();
    const post = await testClient.createPost("test-post");
    await testClient.createPost(uuid, post.contents.object.id);

    const trigger = new ActivityPubTrigger({
      host: app.host,
      user: app.account,
      protocol: app.protocol,
    });

    const posts = await trigger.run();

    expect(
      posts.find((p) => p.replyto === post.contents.object.inReplyTo),
    ).toBeTruthy();
  });

  test("ignore indirect ActivityPub replies", async () => {
    const uuid = crypto.randomUUID();
    await testClient.createPost(uuid, `https://example.org/test/${uuid}`);

    const trigger = new ActivityPubTrigger({
      host: app.host,
      user: app.account,
      protocol: app.protocol,
    });

    const posts = await trigger.run();

    expect(!posts.find((post) => post.message === uuid)).toBeTruthy();
  });

  test("ignore ActivityPub reply to indirect reply", async () => {
    const uuid1 = crypto.randomUUID();
    const indirectReply = await testClient.createPost(
      uuid1,
      `https://example.org/test/${uuid1}`,
    );
    const uuid2 = crypto.randomUUID();
    await testClient.createPost(uuid2, indirectReply.contents.object.id);

    const trigger = new ActivityPubTrigger({
      host: app.host,
      user: app.account,
      protocol: app.protocol,
    });

    const posts = await trigger.run();

    expect(!posts.find((post) => post.message === uuid2)).toBeTruthy();
  });

  test("ignore ActivityPub reply to reply to indirect reply", async () => {
    const uuid1 = crypto.randomUUID();
    const indirectReply = await testClient.createPost(
      uuid1,
      `https://example.org/test/${uuid1}`,
    );

    const uuid2 = crypto.randomUUID();
    const indirectReplyReply = await testClient.createPost(
      uuid2,
      indirectReply.contents.object.id,
    );

    const uuid3 = crypto.randomUUID();
    await testClient.createPost(uuid3, indirectReplyReply.contents.object.id);

    const trigger = new ActivityPubTrigger({
      host: app.host,
      user: app.account,
      protocol: app.protocol,
    });

    const posts = await trigger.run();

    expect(!posts.find((post) => post.message === uuid3)).toBeTruthy();
  });

  test("ignore hashtag links", async () => {
    const uuid = crypto.randomUUID();
    await testClient.createPost(
      `<p>
        <a href="https://example.org/tags/${uuid}" class="mention hashtag" rel="tag">
          #<span>${uuid}</span>
        </a>
      </p>`,
    );

    const trigger = new ActivityPubTrigger({
      host: app.host,
      user: app.account,
      protocol: app.protocol,
    });

    const posts = await trigger.run();

    expect(posts.find((post) => post.message === `#${uuid}`)).toBeTruthy();
  });

  test("strip out trailing hashtags", async () => {
    const hashtag = crypto.randomBytes(20).toString("hex");
    await testClient.createPost(
      `<p>
        Hashtag test
        <a href="https://example.org/tags/${hashtag}" class="mention hashtag" rel="tag">
          #<span>${hashtag}</span>
        </a>
      </p>`,
    );

    const trigger = new ActivityPubTrigger({
      host: app.host,
      user: app.account,
      protocol: app.protocol,
      removeTrailingHashtags: true,
    });

    const posts = await trigger.run();

    expect(!posts.find((p) => p.message.includes(hashtag))).toBeTruthy();
  });

  test("retain body hashtags", async () => {
    const hashtag = crypto.randomBytes(20).toString("hex");
    await testClient.createPost(
      `<p>
        1
        <a href="https://example.org/tags/${hashtag}" class="mention hashtag" rel="tag">
          #<span>${hashtag}</span>
        </a>
        2
      </p>`,
    );

    const trigger = new ActivityPubTrigger({
      host: app.host,
      user: app.account,
      protocol: app.protocol,
      removeTrailingHashtags: true,
    });

    const posts = await trigger.run();

    expect(posts.find((p) => p.message === `1 #${hashtag} 2`)).toBeTruthy();
  });

  test("returns posts in order of published timestamp ascending", async () => {
    await testClient.createPost(`Post 1`);
    await testClient.createPost(`Post 2`);
    await testClient.createPost(`Post 3`);

    const trigger = new ActivityPubTrigger({
      host: app.host,
      user: app.account,
      protocol: app.protocol,
    });

    const posts = await trigger.run();

    expect(posts).toStrictEqual([...posts].sort(byPublishedTimestamp));
  });
});

function byPublishedTimestamp(a: Post, b: Post) {
  return a.published < b.published ? -1 : a.published > b.published ? 1 : 0;
}

afterAll(() => {
  return app.stop();
});
