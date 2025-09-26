import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const privateKey = generatePrivateKey();
const { address } = privateKeyToAccount(privateKey);

// Output only the address and private key, each on its own line
// eslint-disable-next-line no-console
console.log(address);
// eslint-disable-next-line no-console
console.log(privateKey);


