# Integration Map

How components connect and what data flows between them.

### Erc721-stylus --> Frontend-scaffold

- **Source**: Erc721-stylus (`8f3c7453`)
  - Output ports: NFT Contract (contract)
- **Target**: Frontend-scaffold (`6bba2410`)
  - Input ports: Contract ABI (contract), Network Config (config)

### Frontend-scaffold --> Wallet-auth

- **Source**: Frontend-scaffold (`6bba2410`)
  - Output ports: App Context (config)
- **Target**: Wallet-auth (`4a9376ef`)
  
