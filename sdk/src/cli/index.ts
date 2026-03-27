#!/usr/bin/env node

import { parseArgs } from './parser';
import { cmdLink } from './commands/link';
import { cmdBalance } from './commands/balance';
import { cmdPay } from './commands/pay';
import { cmdInfo } from './commands/info';
import { cmdVersion } from './commands/version';
import { printHelp } from './help';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  try {
    switch (command) {
      case 'link':
        await cmdLink(parseArgs(args.slice(1)));
        break;
      case 'pay':
        await cmdPay(parseArgs(args.slice(1)));
        break;
      case 'balance':
        await cmdBalance(parseArgs(args.slice(1)));
        break;
      case 'info':
        await cmdInfo(parseArgs(args.slice(1)));
        break;
      case 'version':
      case '-v':
      case '--version':
        cmdVersion();
        break;
      case 'help':
      case '-h':
      case '--help':
      case undefined:
        printHelp();
        break;
      default:
        console.error(`\x1b[31m✗ Unknown command: ${command}\x1b[0m\n`);
        printHelp();
        process.exit(1);
    }
  } catch (err: any) {
    console.error(`\x1b[31m✗ ${err.message}\x1b[0m`);
    process.exit(1);
  }
}

main();
