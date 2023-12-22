import * as core from '@actions/core'

type Item = any | { readonly key: string }

type Config = Map<string, [string, string][]>

export class ActionslawAction {

  async run(): Promise<void> {
    const config =
      new Map(
        Object.entries(
          JSON.parse(
            core.getInput('on', { required: true })
          )
        )
      ) as Config

    core.info(`🔫 running actionslaw [${Array.from(config.keys())}] triggers`)

    const items: Item[] =
      [
        {
          key: "key",
          title: "test-title",
          contentSnippet: "snippet",
          link: "https://example.org"
        }
      ]

    console.debug(`🔫 triggering [${items.map(item => item.key)}]`)

    core.setOutput('items', JSON.stringify(items))
  }

}
