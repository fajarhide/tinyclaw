import { Bot } from "grammy";
import type { TelegramBridgeConfig } from "./config";
import { createChatHandler, type ChatHandlerDeps } from "./chat-handler";
import type { TelegramBotInfo } from "./group-message";

export async function createBot(
  config: TelegramBridgeConfig,
  deps: Omit<ChatHandlerDeps, "config" | "getBotInfo"> & {
    getBotInfo?: () => TelegramBotInfo | undefined;
  },
): Promise<Bot> {
  const bot = new Bot(config.botToken);
  await bot.init();

  const initializedBotInfo: TelegramBotInfo = {
    id: bot.botInfo.id,
    username: bot.botInfo.username,
  };

  const handleMessage = createChatHandler({
    ...deps,
    config,
    getBotInfo: () => deps.getBotInfo?.() ?? initializedBotInfo,
  });

  bot.use(async (ctx, next) => {
    console.log(
      "[telegram-update]",
      JSON.stringify({
        updateId: ctx.update.update_id,
        keys: Object.keys(ctx.update),
        hasMessage: Boolean(ctx.message),
        hasEditedMessage: Boolean(ctx.editedMessage),
        hasChannelPost: Boolean(ctx.channelPost),
        hasEditedChannelPost: Boolean(ctx.editedChannelPost),
        chatId: ctx.chat?.id ?? null,
        chatType: ctx.chat?.type ?? null,
        fromId: ctx.from?.id ?? null,
        senderChatId: ctx.msg?.sender_chat?.id ?? null,
        text: previewTelegramText(ctx.msg?.text),
        caption: previewTelegramText(ctx.msg?.caption),
        entityTypes: ctx.msg?.entities?.map((entity) => entity.type) ?? [],
        captionEntityTypes: ctx.msg?.caption_entities?.map((entity) => entity.type) ?? [],
      }),
    );

    await next();
  });

  bot.on("message", handleMessage);

  bot.catch((error) => {
    console.error("Telegram bot error:", error);
  });

  return bot;
}

function previewTelegramText(text: string | undefined, maxLength = 120): string | null {
  if (!text) {
    return null;
  }

  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}
