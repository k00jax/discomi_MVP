export type CustomEntities = {
  important_terms?: string[]; // User-provided list of names/terms to transcribe correctly
};

export type UserConfig = {
  uid: string;
  webhook_url: string;
  token: string;
  custom_entities?: CustomEntities;
  options?: {
    includeTranscript?: boolean;
    maxChars?: number;
  };
};
