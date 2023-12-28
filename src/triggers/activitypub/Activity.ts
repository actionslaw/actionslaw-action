interface Attachment {
  url: string;
}

export interface Activity {
  readonly id: string;
  readonly type: string;
  readonly published: Date;
  readonly object: {
    readonly type: String;
    readonly content: string;
    readonly inReplyTo?: string;
    readonly attachment?: Attachment[];
  };
}
