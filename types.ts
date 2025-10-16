export type UserConfig = {
  webhookUrl: string;
  token: string;
  options?: {
    includeTranscript?: boolean;
    includeAudio?: boolean;
    maxChars?: number;
  };
};
