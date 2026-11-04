const BOT_ACTION_CAPABILITY = Symbol("server-owned-bot-action");

export type BotActionPrincipalInput = {
  roomId: string;
  botId: string;
  actionRevision: string;
  decisionId: string;
};

export type BotActionPrincipal = BotActionPrincipalInput & {
  readonly [BOT_ACTION_CAPABILITY]: true;
};

export function createBotActionPrincipal(input: BotActionPrincipalInput): BotActionPrincipal {
  return Object.freeze({ ...input, [BOT_ACTION_CAPABILITY]: true as const });
}

export function isBotActionPrincipal(value: unknown): value is BotActionPrincipal {
  if (!value || typeof value !== "object") return false;
  const principal = value as Partial<BotActionPrincipal>;
  return principal[BOT_ACTION_CAPABILITY] === true
    && typeof principal.roomId === "string"
    && typeof principal.botId === "string"
    && typeof principal.actionRevision === "string"
    && typeof principal.decisionId === "string";
}
