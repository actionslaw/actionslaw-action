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

export class ActivityPubTestClient {
  private readonly endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async createPost(message: string, reply?: string): Promise<TestPost> {
    const post: TestObject = {
      object: {
        type: "Note",
        content: message,
      },
    };

    const body = reply ? replyTo(reply, message) : post;

    const response = await fetch(`${this.endpoint}/admin/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    return JSON.parse(text) as TestPost;
  }
}
