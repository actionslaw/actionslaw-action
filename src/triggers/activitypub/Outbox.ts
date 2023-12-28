import { Activity } from "./Activity";

interface Outbox {
  readonly orderedItems: Item[];
}

interface Item {
  readonly id: string;
  readonly type: string;
  readonly published: string;
  readonly object: {
    readonly id: string;
    readonly type: string;
    readonly content: string;
    readonly inReplyTo?: string;
    readonly attachment?: [];
  };
}

function findParentReplies(
  source: Item,
  outbox: Outbox,
  accumulator: Activity[] = [],
  depth: number = 5,
): Activity[] {
  const parent = outbox.orderedItems.filter(
    (item) => item.object.id === source.object.inReplyTo,
  )[0];

  if (parent && depth > 1)
    return findParentReplies(
      parent,
      outbox,
      accumulator.concat([toActivity(parent)]),
      depth - 1,
    );
  else return accumulator;
}

function toActivity(item: Item, replies: Activity[] = []): Activity {
  return {
    id: item.id,
    type: item.type,
    replies: replies,
    published: new Date(Date.parse(item.published)),
    object: item.object,
  };
}

export function fromJson(json: string): Activity[] {
  const outbox: Outbox = JSON.parse(json);
  return outbox.orderedItems.map((item) =>
    toActivity(item, findParentReplies(item, outbox)),
  );
}
