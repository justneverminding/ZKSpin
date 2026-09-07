# ZKSpin

ZKSpin is a test-credit roulette demo whose blockchain mode derives each result from a Zcash testnet block hash reported by CipherScan.

## Trust model

- CipherScan is a trusted data source. The app does not run a Zcash node or verify a chain proof.
- Results are deterministic and independently reproducible once the reported block hash is known.
- Testnet rounds settle after one source-reported confirmation for faster spins. A mainnet deployment should use a higher confirmation depth and stronger reorganization handling.
- Balances, wagers, and history are local browser state. They are test credits, not ZEC, and are not suitable for real-value play.
- Despite the project name, this version does not implement a zero-knowledge proof or provide transaction privacy.

## Result derivation

The client validates a 64-character hexadecimal block hash, lowercases it, and hashes the UTF-8 string `zkspin:v1:<block-hash>` with SHA-256. It scans the digest for the first byte from 0 through 227 and divides that byte into 38 equal groups of six. This rejection-sampling step gives every American roulette pocket the same probability.

## Development

```bash
npm install
npm run dev
```

Use `npm test` for deterministic verifier tests and `npm run typecheck` for TypeScript validation.
