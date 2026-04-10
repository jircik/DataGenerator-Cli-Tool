#!/usr/bin/env node

import { Command } from 'commander';
import { registerConnect } from './connect.js';
import { registerDisconnect } from './disconnect.js';
import { registerStatus } from './status.js';
import { registerPopulate } from './populate.js';
import { registerSchema } from './schema.js';
import { registerList } from './list.js';

const program = new Command();

program
  .name('datagen')
  .description('CLI tool to populate databases with realistic fake data')
  .version('0.1.0');

registerConnect(program);
registerDisconnect(program);
registerStatus(program);
registerPopulate(program);
registerSchema(program);
registerList(program);

program.parse();