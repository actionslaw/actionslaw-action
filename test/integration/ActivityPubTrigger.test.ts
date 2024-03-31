import { describe, expect, test } from "@jest/globals";
import * as crypto from "crypto";
import { ActivityPubApp } from "activitypub-starter-kit.rg-wood";
import { ActivityPubTestClient } from "./ActivityPubTestClient";
import {
  ActivityPubTrigger,
  Post,
} from "../../src/triggers/ActivityPubTrigger";

const app = ActivityPubApp.testApp();

app.start();

const testClient = new ActivityPubTestClient(`${app.protocol}://${app.host}`);

describe("ActivityPubTrigger should", () => {
  test("read ActivityPub posts", async () => {
    const uuid = crypto.randomUUID();
    const expectedPost = await testClient.createPost(`<p>${uuid}</p>`);
    const expectedKey = expectedPost.contents.object.id;

    const trigger = new ActivityPubTrigger({
      host: app.host,
      id: app.account,
      protocol: app.protocol,
      cutoff: 120,
    });

    const posts = await trigger.run();

    expect(posts.find((post) => post.message === uuid)).toBeTruthy();
    expect(posts.find((post) => expectedKey!.includes(post.key))).toBeTruthy();
  });

  test("read ActivityPub posts with URL", async () => {
    const url = `https://example.org/${crypto.randomUUID()}`;
    await testClient.createPost(`<p><a href=${url}>${url}</a></p>`);

    const trigger = new ActivityPubTrigger({
      host: app.host,
      id: app.account,
      protocol: app.protocol,
      cutoff: 120,
    });

    const posts = await trigger.run();

    expect(posts.find((post) => post.message === url)).toBeTruthy();
  });

  test("read ActivityPub replies", async () => {
    const post = await testClient.createPost("test-post");
    const uuid = crypto.randomUUID();
    await testClient.createPost(uuid, {
      reply: post.contents.object.id,
      replyAccountId: app.account,
    });

    const trigger = new ActivityPubTrigger({
      host: app.host,
      id: app.account,
      protocol: app.protocol,
      cutoff: 120,
    });

    const posts = await trigger.run();

    expect(posts.find((post) => post.message === uuid)).toBeTruthy();
  });

  test("read ActivityPub replies to replies", async () => {
    const post = await testClient.createPost("test-post");
    const reply1 = await testClient.createPost(crypto.randomUUID(), {
      reply: post.contents.object.id,
      replyAccountId: app.account,
    });
    const content = crypto.randomUUID();
    await testClient.createPost(content, {
      reply: reply1.contents.object.id,
      replyAccountId: app.account,
    });

    const trigger = new ActivityPubTrigger({
      host: app.host,
      id: app.account,
      protocol: app.protocol,
      cutoff: 120,
    });

    const posts = await trigger.run();

    expect(posts.find((post) => post.message === content)).toBeTruthy();
  });

  test("ignore indirect ActivityPub replies", async () => {
    const content = crypto.randomUUID();
    const uuid = crypto.randomUUID();
    await testClient.createPost(content, {
      reply: `https://example.org/test/${crypto.randomUUID()}`,
      replyAccountId: uuid,
    });

    const trigger = new ActivityPubTrigger({
      host: app.host,
      id: app.account,
      protocol: app.protocol,
      cutoff: 120,
    });

    const posts = await trigger.run();

    expect(posts.find((post) => post.message === content)).toBeFalsy();
  });

  test("ignore ActivityPub reply to indirect reply", async () => {
    const uuid1 = crypto.randomUUID();
    const indirectReply = await testClient.createPost(uuid1, {
      reply: `https://example.org/test/${uuid1}`,
    });
    const uuid2 = crypto.randomUUID();
    await testClient.createPost(uuid2, {
      reply: indirectReply.contents.object.id,
    });

    const trigger = new ActivityPubTrigger({
      host: app.host,
      id: app.account,
      protocol: app.protocol,
      cutoff: 120,
    });

    const posts = await trigger.run();

    expect(posts.find((post) => post.message === uuid2)).toBeFalsy();
  });

  test("ignore ActivityPub reply to reply to indirect reply", async () => {
    const uuid1 = crypto.randomUUID();
    const indirectReply = await testClient.createPost(uuid1, {
      reply: `https://example.org/test/${uuid1}`,
    });

    const uuid2 = crypto.randomUUID();
    const indirectReplyReply = await testClient.createPost(uuid2, {
      reply: indirectReply.contents.object.id,
    });

    const uuid3 = crypto.randomUUID();
    await testClient.createPost(uuid3, {
      reply: indirectReplyReply.contents.object.id,
    });

    const trigger = new ActivityPubTrigger({
      host: app.host,
      id: app.account,
      protocol: app.protocol,
      cutoff: 120,
    });

    const posts = await trigger.run();

    expect(posts.find((post) => post.message === uuid3)).toBeFalsy();
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
      id: app.account,
      protocol: app.protocol,
      cutoff: 120,
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
      id: app.account,
      protocol: app.protocol,
      removeTrailingHashtags: true,
      cutoff: 120,
    });

    const posts = await trigger.run();

    expect(posts.find((p) => p.message.includes(hashtag))).toBeFalsy();
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
      id: app.account,
      protocol: app.protocol,
      removeTrailingHashtags: true,
      cutoff: 120,
    });

    const posts = await trigger.run();

    expect(posts.find((p) => p.message === `1 #${hashtag} 2`)).toBeTruthy();
  });

  test("output trailing hashtag", async () => {
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
      id: app.account,
      protocol: app.protocol,
      removeTrailingHashtags: true,
      cutoff: 120,
    });

    const posts = await trigger.run();

    expect(posts.find((p) => p.tags === `["#${hashtag}"]`)).toBeTruthy();
  });

  test("output trailing hashtags", async () => {
    const hashtag1 = crypto.randomBytes(20).toString("hex");
    const hashtag2 = crypto.randomBytes(20).toString("hex");
    await testClient.createPost(
      `<p>
            Hashtag test
            <a href="https://example.org/tags/${hashtag1}" class="mention hashtag" rel="tag">
              #<span>${hashtag1}</span>
            </a>
            <a href="https://example.org/tags/${hashtag2}" class="mention hashtag" rel="tag">
              #<span>${hashtag2}</span>
            </a>
          </p>`,
    );

    const trigger = new ActivityPubTrigger({
      host: app.host,
      id: app.account,
      protocol: app.protocol,
      removeTrailingHashtags: true,
      cutoff: 120,
    });

    const posts = await trigger.run();

    expect(
      posts.find((p) => p.tags === `["#${hashtag1}","#${hashtag2}"]`),
    ).toBeTruthy();
  });

  test("returns posts in order of published timestamp ascending", async () => {
    await testClient.createPost(`Post 1`);
    await testClient.createPost(`Post 2`);
    await testClient.createPost(`Post 3`);

    const trigger = new ActivityPubTrigger({
      host: app.host,
      id: app.account,
      protocol: app.protocol,
      cutoff: 120,
    });

    const posts = await trigger.run();

    expect(posts).toStrictEqual([...posts].sort(byPublishedTimestamp));
  });

  test("downloads attachments", async () => {
    const uuid = crypto.randomUUID();
    const attachment = `http://localhost:8080/${uuid}.txt`;
    await testClient.createPost(uuid, {
      attachment: attachment,
    });

    const trigger = new ActivityPubTrigger({
      host: app.host,
      id: app.account,
      protocol: app.protocol,
      cutoff: 120,
    });

    const posts = await trigger.run();

    expect(posts.find((p) => p.media!.includes(attachment))).toBeTruthy();
  });

  test("ignore ActivityPub posts with not content", async () => {
    const expectedPost = await testClient.createPost("");
    const expectedId = expectedPost.contents.object.id;

    const trigger = new ActivityPubTrigger({
      host: app.host,
      id: app.account,
      protocol: app.protocol,
      cutoff: 120,
    });

    const posts = await trigger.run();

    expect(posts.find((post) => post.key === expectedId)).toBeFalsy();
  });
});

function byPublishedTimestamp(a: Post, b: Post) {
  return a.published < b.published ? -1 : a.published > b.published ? 1 : 0;
}

afterAll(() => {
  app.stop();
});
