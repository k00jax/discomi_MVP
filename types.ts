export type UserConfig = {
  uid: string;
  webhook_url: string;
  token: string;
  options?: {
    includeTranscript?: boolean;
    maxChars?: number;
  };
};
