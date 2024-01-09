import { describe, expect, test } from "@jest/globals";
import { promisify } from "util";
import { exec } from "child_process";

const command = /^::(\S*) name=(\S*)::(.*)$/;

function parseActionCommand(line: string): [string, string] | undefined {
  const matches = command.exec(line);
  if (matches) return [matches[2], matches[3]];
}

function parseActionOutput(output: string): Map<string, string> {
  return new Map(
    output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .map(parseActionCommand)
      .filter((command): command is [string, string] => !!command),
  );
}

describe("Actionslaw action should", () => {
  test("output ordered lists of items", async () => {
    const config = JSON.stringify({
      rss: {
        url: "https://hnrss.org/newest?points=300&count=3",
      },
    });

    const output = await promisify(exec)(`${process.execPath} dist/main.js`, {
      env: {
        INPUT_ON: config,
        INPUT_CACHE: "false",
      },
    });

    const commands = parseActionOutput(output.stdout);
    const items = JSON.parse(commands.get("items") || "[]");

    expect(items.length).toBe(3);
    expect(items).toStrictEqual([...items].sort(byIsoDate));
  });
});

function byIsoDate(a: any, b: any) {
  return a.isoDate > b.isoDate ? -1 : a.isoDate < b.isoDate ? 1 : 0;
}
