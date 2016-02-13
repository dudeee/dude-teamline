import define from './actions/define';
import list from './actions/list';
import refresh from './actions/refresh';
import remove from './actions/remove';

export default async (bot, uri) => {
  list(bot, uri);
  refresh(bot, uri);
  remove(bot, uri);
  define(bot, uri);

  const wait = 500;
  bot.command('^(actions | action) help', async message => {
    message.reply(`Hello friend!
I'm Mashti, you might not know me, but you know my grandpa, Friedrich Nietzsche. *⏞*`,
      {
        attachments: [{
          image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Nietzsche187a.jpg/884px-Nietzsche187a.jpg',
          color: '#000000',
          text: 'A moment of silence for my beloved grandpa 😭. Look at his fabulous mustache!',
          fallback: 'A moment of silence for my beloved grandpa 😭. Look at his fabulous mustache!',
          title: 'Friedrich Nietzsche',
          title_link: 'https://en.wikipedia.org/wiki/Friedrich_Nietzsche'
        }],
        websocket: false
      });

    await new Promise(resolve => setTimeout(resolve, wait));

    message.reply(`
Here is an introduction to how I work:

First of all, I know you're all lazy geeks 😪 who moan when told to check their Trello board,
so here's the deal, I have a command called \`list\` which you can use to find anything related to
you. Examples:

\`list my roles\`
\`list my projects\`
\`list all teams\`
\`list all projects\`
\`list @mahdi projects\`
\`list @fattah roles\` _we all know the answer to this one, but let's move on_`);

    await new Promise(resolve => setTimeout(resolve, wait));

    await message.reply(`
Now let's get to action! ⚔

You define your actions using the same syntax you used in mailing list
only with a prefix command \`actions\`, but I'm smarter than you thought,
I will forgive your writing mistakes to some extend.

\`actions some project name > some action\`
\`actions team > project > action\`

To review the list your actions for today, use \`actions\` without any argument.

\`actions\`

My answer looks something like this:
> 1. *Free Money* > Try to play football as much as possible
> 2. *Disturb people* > Talk louder everyday, progress so people won't notice

You can also create projects on the fly, which will then be placed as a card in the
*Homeless Projects* list of your team board, specifying team is mandatory in this case.

\`actions team > +newproject > action\`

You can also define recurring actions for your role,
wrap the role name in parantheses and you are done!

\`actions (role) > action\`
\`actions team > (role) > action\`

You can also clear or remove a specific action using two simple commands:

\`actions clear\`
\`actions remove 1\`
\`actions remove 2\`

All actions associated with a project or role will be placed as a single comment on it's card.
Don't worry, I'm not going to pollute your cards, I will update my last comment.

I think that's it for now, if you have any questions, message @mahdi.
`);
  });

  // bot.listen(/teamline done (?:#)?(\d+)/i, async message => {
  //   let [id] = message.match;
  //
  //   let employee = await findEmployee(uri, bot, message);
  //
  //   let action = await request('put', `${uri}/employee/${employee.id}/action/${id}`, null, {
  //     done: true
  //   });
  //
  //   const congrats = bot.random('Good job! 👍', 'Thank you! 🙏', 'Unto the next! ✊');
  //   message.reply(`Marked #${action.id} as done. ${congrats}`);
  // });
  //
  // bot.listen(/teamline undone (?:#)?(\d+)/i, async message => {
  //   let [id] = message.match;
  //
  //   let employee = await findEmployee(uri, bot, message);
  //
  //   let action = await request('put', `${uri}/employee/${employee.id}/action/${id}`, null, {
  //     done: false
  //   });
  //
  //   const again = bot.random('There\'s still time!', 'Maybe later.', 'Wanna take a break?');
  //   message.reply(`Marked #${action.id} as undone.`);
  // });
};
