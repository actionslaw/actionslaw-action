# Actionslaw Action

GitHub Action to trigger automated [Actionslaw](https://github.com/actionslaw) workflows.

## Usage

Example:

```yml
name: Actionslaw
on:
  schedule:
    - cron: "*/15 * * * *"

jobs:
  actionslaw:
    steps:
      - uses: actions/actionslaw@v0.1
          on:
            rss:
              url: https://hnrss.org/newest?points=300&count=3

jobs:
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

