const NEON = '\x1b[32m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[90m';
const BOLD = '\x1b[1m';
const R = '\x1b[0m';

export function printHelp() {
  console.log(`
${NEON}${BOLD}  GATEX402 CLI${R} ${DIM}v1.0.0${R}
${DIM}  x402 Payment Gateway for Solana${R}

${CYAN}  USAGE${R}
    ${BOLD}gatex402${R} <command> [options]

${CYAN}  COMMANDS${R}
    ${BOLD}link${R}       Generate a payment link
    ${BOLD}pay${R}        Send a headless payment
    ${BOLD}balance${R}    Check wallet token balance
    ${BOLD}info${R}       Look up a transaction
    ${BOLD}version${R}    Show version
    ${BOLD}help${R}       Show this help

${CYAN}  LINK${R}
    gatex402 link --amount 50 --currency USDC --label "Invoice #42"
    gatex402 link --amount 1.5 --currency SOL --expiry 24h

    ${DIM}--amount${R}     Payment amount ${DIM}(required)${R}
    ${DIM}--currency${R}   Token symbol ${DIM}(default: USDC)${R}
    ${DIM}--label${R}      Display label
    ${DIM}--expiry${R}     Expiry duration ${DIM}(e.g. 1h, 24h, 7d)${R}
    ${DIM}--merchant${R}   Merchant wallet ${DIM}(or set GATEX402_MERCHANT)${R}

${CYAN}  PAY${R}
    gatex402 pay --to <wallet> --amount 5 --currency SOL --key <path>

    ${DIM}--to${R}         Recipient wallet ${DIM}(required)${R}
    ${DIM}--amount${R}     Payment amount ${DIM}(required)${R}
    ${DIM}--currency${R}   Token symbol ${DIM}(default: SOL)${R}
    ${DIM}--memo${R}       On-chain memo
    ${DIM}--key${R}        Path to keypair JSON ${DIM}(or set GATEX402_KEY)${R}
    ${DIM}--network${R}    mainnet or devnet ${DIM}(default: mainnet)${R}

${CYAN}  BALANCE${R}
    gatex402 balance --wallet <address> --currency USDC

    ${DIM}--wallet${R}     Wallet address ${DIM}(required)${R}
    ${DIM}--currency${R}   Token symbol ${DIM}(default: SOL)${R}
    ${DIM}--network${R}    mainnet or devnet ${DIM}(default: mainnet)${R}

${CYAN}  INFO${R}
    gatex402 info --sig <transaction_signature>

    ${DIM}--sig${R}        Transaction signature ${DIM}(required)${R}
    ${DIM}--network${R}    mainnet or devnet ${DIM}(default: mainnet)${R}

${CYAN}  ENV VARS${R}
    ${DIM}GATEX402_MERCHANT${R}   Default merchant wallet
    ${DIM}GATEX402_KEY${R}        Default keypair path
    ${DIM}GATEX402_NETWORK${R}    Default network (mainnet/devnet)
    ${DIM}GATEX402_RPC${R}        Custom RPC endpoint
`);
}
