import { cleanDb } from './cleanDb';

beforeAll(async () => {
  await cleanDb();
});
