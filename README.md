# Actionslaw Action [![Build](https://github.com/actionslaw/actionslaw-action/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/actionslaw/actionslaw-action/actions/workflows/test.yml)

GitHub Action to trigger automated [Actionslaw](https://github.com/actionslaw) workflows.

## Usage

Example:

```yml
name: Actionslaw
on:
  schedule:
    - cron: "*/15 * * * *"
  push:
    branches:
      - main

jobs:
  actionslaw:
    runs-on: ubuntu-latest
    steps:
      - uses: actionslaw/actionslaw-action@v1
        with:
          on: '{ "rss": { "url": "https://hnrss.org/newest?points=300&count=3" } }'

  print:
    needs: actionslaw
    strategy:
      matrix:
        items: ${needs.actionslaw.outputs.items}
    name: Print
    runs-on: ubuntu-latest
    steps:
      - name: Print Outputs
        env:
          title: ${{matrix.items.title}}
          contentSnippet: ${{matrix.items.contentSnippet}}
          link: ${{matrix.items.link}}
        run: |
          echo title: $title
          echo contentSnippet: $contentSnippet
          echo link: $link
```

The action inputs are:

| Input   | Description                             | Required/Default |
| ------- | --------------------------------------- | ---------------- |
| `on`    | JSON trigger configuration (see below). | Required         |
| `cache` | Enable trigger cache.                   | `true`           |

### ActivityPub Trigger

Configured as follows:

```json
{
  "activitypub": {
    "user": "username",
    "host": "example.com"
  }
}
```

#### Options

- `host`, required, hostname of source ActivityPub instance
- `user`, required, source user account
- `cutoff`, optional (default `30`), grace period in minutes before which posts are ignored

#### Outputs

This trigger's outputs will be the following object.

An outputs example:

```json
{
  "uri": "uniqueId",
  "message": "hello world title",
  "replyto": "optionalUniqueReplyId",
  "media": "optionalMediaCacheKey"
}
```

You can use the outputs like this:

```yaml
jobs:
  print:
    name: Print
    runs-on: ubuntu-latest
    steps:
      - name: Print Post Outputs
        env:
          uri: ${{on.activitypub.outputs.uri}}
          message: ${{on.activitypub.outputs.message}}
          reply: ${{ on.activitypub.outputs.replyto}}
        run: |
          echo uri: $uri
          echo message: $message
          echo reply: $reply
```

#### Limitations

Please note that:

- **Direct replies only.** By design, the trigger will only fire for direct replies from the original account owner.
- **30 minute Cutoff.** Similarly, the trigger will ignore any posts made within a cutoff period of half-an-hour. Any posts made before `T - 30` will be ignored to prevent accidental spamming. This period can be configured (see above).
- **No polls.** We do not currently support poll posts.
- **Public only.** We only support public ActivityPub posts.
- **English only.** We currently only support posts using the `en` (English) language code.

### RSS Trigger

Configured as follows:

```json
{
  "rss": {
    "url": "https://hnrss.org/newest?points=300&count=3"
  }
}
```

Requires the `url` path to the RSS feed.
