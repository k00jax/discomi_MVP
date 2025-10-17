export type CustomEntities = {
  names?: Record<string, string>;
  companies?: Record<string, string>;
  places?: Record<string, string>;
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
