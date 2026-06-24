import { TinyJetstream } from "mbjc/tinyjetstream";

export interface BlueskyMessage {
  did: string;
  rkey: string;
  text: string;
  time: number;
}

export async function fetchLatestMessages(
  n: number
): Promise<BlueskyMessage[]> {
  const messages: BlueskyMessage[] = [];
  const jetstream = new TinyJetstream();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      jetstream.stop();
      reject(new Error("Timeout fetching messages"));
    }, 30000); // 30 second timeout

    jetstream.onTweet = (e) => {
      try {
        messages.push({
          did: e.did,
          rkey: e.commit.rkey,
          text: e.commit.record.text,
          time: Date.now()
        });
        if (messages.length >= n) {
          clearTimeout(timeout);
          jetstream.stop();
          resolve(messages);
        }
      } catch (error) {
        clearTimeout(timeout);
        jetstream.stop();
        reject(error);
      }
    };

    try {
      jetstream.start();
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}
