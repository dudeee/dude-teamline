import initialize from './initialize';

export default async function close() {
  const { app } = await initialize();
  // app._router.stack.length = 0;
  app._router.stack = app._router.stack.filter(a => a.name !== 'bound dispatch');
}
