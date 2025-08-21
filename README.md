# TradeFin

A blockchain-powered trade finance platform that streamlines cross-border transactions by tracking invoices, goods, and payments on-chain, reducing disputes, fraud, and settlement times while promoting financial inclusion through transparent lending.

---

## Overview

TradeFin consists of four main smart contracts that together form a decentralized, transparent, and efficient ecosystem for trade finance participants, including exporters, importers, banks, and logistics providers:

1. **Invoice Management Contract** – Creates, verifies, and tracks trade invoices on-chain.
2. **Escrow Payment Contract** – Manages secure escrow funds with automated releases based on triggers.
3. **Oracle Integration Contract** – Connects to off-chain data for real-time exchange rates, shipment status, and verification.
4. **Dispute Resolution Contract** – Handles disputes through on-chain arbitration and voting mechanisms.

---

## Features

- **On-chain invoice tracking** for immutable records of trade documents  
- **Automated escrow releases** triggered by status codes (e.g., delivery confirmation)  
- **Real-time data integration** via oracles for exchange rates and logistics updates  
- **Dispute resolution** with transparent arbitration to minimize legal costs  
- **Fraud reduction** through verifiable letters of credit and payment histories  
- **Financial inclusion** by enabling transparent lending for underserved markets  
- **ISO 20022 compliance** for standardized financial messaging interoperability  

---

## Smart Contracts

### Invoice Management Contract
- Create and mint digital invoices as NFTs or tokens for uniqueness
- Verify invoice details against off-chain proofs (via oracle)
- Track status updates (e.g., issued, approved, paid) with timestamps

### Escrow Payment Contract
- Deposit funds into escrow for letters of credit
- Automated releases based on conditions like delivery confirmation or invoice approval
- Partial payments and refunds for disputes

### Oracle Integration Contract
- Secure feeds for exchange rates, shipment tracking, and customs data
- Trigger events in other contracts (e.g., release escrow on delivery)
- Data validation to prevent manipulation

### Dispute Resolution Contract
- Submit disputes with evidence linked to invoices
- Arbitration voting by stakeholders (e.g., token holders or appointed arbitrators)
- Enforce resolutions like fund reallocations or penalties

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started)
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/tradefin.git
   ```
3. Run tests:
    ```bash
    npm test
    ```
4. Deploy contracts:
    ```bash
    clarinet deploy
    ```

## Usage

Each smart contract operates independently but integrates with others for a complete trade finance workflow. Refer to individual contract documentation for function calls, parameters, and usage examples.

## License

MIT License