import { Account } from "./Account";
import { ActivityPubConfig } from "./ActivityPubTrigger";
import { HttpClient } from "typed-rest-client/HttpClient";

export class WebFinger {
  private static http = new HttpClient("@actionsflow/trigger-activitypub");

  static async discover(
    server: URL,
    config: ActivityPubConfig,
  ): Promise<Account> {
    const webFingerPath = `${server.toString()}.well-known/webfinger`;
    const uri = `${webFingerPath}?resource=acct:${config.user}@${config.host}`;

    const response = await WebFinger.http.get(uri);

    const body = await response.readBody();
    const actor: Account = JSON.parse(body);
    return actor;
  }
}
