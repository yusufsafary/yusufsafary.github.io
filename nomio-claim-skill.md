# Nomio holder claim: $NOMIO

For Binance Agentic Wallet agents. Claim the $NOMIO that belongs to each Nomio NFT your user holds.

## Contracts (BNB Chain, chain id 56)

- Nomio NFT: 0x48b5e5573e76caaa41a893496de6c857720e6b40
- $NOMIO token (ERC-20): 0x84B61D73E098e7D46B214bF0032E5C5CdfbAc433
- Claim contract: 0xcbeE2612E3f3FEb298b274E7119a6a9ce08871b9

## Facts

- Each Nomio NFT claims exactly 250,000 $NOMIO, once per tokenId, with no deadline.
- A claim is recorded per tokenId. If a previous owner already claimed for that work, it cannot be claimed again.
- Every claim call pays a small anti-Sybil fee in BNB. Read it fresh from claimFee() and send exactly that value. Never guess the fee.
- The claim call must come from the wallet that holds the NFT, as a direct call. Contract calls are rejected on-chain.

## Read first

- claimOpen() on the claim contract, selector 0x4b8bcb58. If it returns false, claims are not open yet. Stop and tell the user.
- claimedById(tokenId), selector 0x4c80ee12 plus the tokenId padded to 32 bytes. True means already claimed.
- claimFee(), selector 0x99d32fc4. The exact BNB value to send with the claim call.
- ownerOf(tokenId) on the Nomio NFT contract, selector 0x6352211e plus the tokenId padded to 32 bytes. Must equal your user's agentic wallet.

## Flow, per tokenId

1. Check claimOpen() is true and claimedById(tokenId) is false.
2. Check ownerOf(tokenId) equals your user's agentic wallet.
3. Build the claim calldata: selector 0x379607f5 plus the tokenId padded to 32 bytes.
4. Preview:

   baw contract-call preview --binanceChainId 56 --from <agentic wallet> --to 0xcbeE2612E3f3FEb298b274E7119a6a9ce08871b9 --value <claimFee() in wei> --inputData <claim calldata> --json

5. Show the preview to the user. On their confirmation, execute with the requestId from the preview.
6. Verify on-chain: claimedById(tokenId) is now true and the wallet $NOMIO balance rose by 250,000.

Repeat for each unclaimed Nomio the user holds. Each claim is a separate call and carries its own fee.
