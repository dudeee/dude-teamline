export default async (bot, channel, message) => {
  const team = (await bot.api.team.info()).team;

  return `http://${team.domain}.slack.com/archives/${channel}/p${message.replace(/\D/g, '')}`;
}
