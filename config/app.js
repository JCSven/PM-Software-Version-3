const APP_CONFIG = {
  port: process.env.PORT || 3000,
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  mainDashboardAccessKey: process.env.MAIN_DASHBOARD_ACCESS_KEY || "",
  kevinDashboardAccessKey: process.env.KEVIN_DASHBOARD_ACCESS_KEY || "",
  justinVDashboardAccessKey: process.env.JUSTIN_V_DASHBOARD_ACCESS_KEY || "",
  kevinTelegramChatId: process.env.KEVIN_G_TELEGRAM_CHAT_ID || "",
  justinVTelegramChatId: process.env.JUSTIN_V_TELEGRAM_CHAT_ID || "",
  justinVTelegramUserId: process.env.JUSTIN_V_TELEGRAM_USER_ID || "",
  kevinTelegramUserId: process.env.KEVIN_G_TELEGRAM_USER_ID || "",
};

module.exports = {
  APP_CONFIG,
};
