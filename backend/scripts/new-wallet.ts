import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';

async function main() {
  const kp = Keypair.generate();
  console.log('Public address (fund this on Devnet):', kp.publicKey.toBase58());
  console.log('\nSOLANA_PRIVATE_KEY_BASE64=' + Buffer.from(kp.secretKey).toString('base64'));
  console.log('\nPut the line above in your .env. Never commit it. Use this wallet for Devnet ONLY.');

  try {
    const c = new Connection('https://api.devnet.solana.com', 'confirmed');
    const sig = await c.requestAirdrop(kp.publicKey, 1 * LAMPORTS_PER_SOL);
    await c.confirmTransaction(sig, 'confirmed');
    console.log('\nAirdropped 1 SOL on Devnet.');
  } catch {
    console.log('\nAirdrop failed (rate limited?). Use https://faucet.solana.com with the address above.');
  }
}
void main();
