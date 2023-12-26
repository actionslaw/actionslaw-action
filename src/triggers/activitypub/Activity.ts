interface Attachment {
  url: string;
}

export interface Activity {
  readonly id: string;
  readonly type: string;
  readonly cc: string[];
  readonly published: Date;
  readonly object: {
    readonly type: String;
    readonly contentMap: Record<string, string>;
    readonly inReplyTo?: string;
    readonly attachment?: Attachment[];
  };
}
