#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('datagen')
  .description('CLI tool to populate databases with realistic fake data')
  .version('0.1.0');

program.parse();
