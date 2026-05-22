import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying BlackjackLeaderboard...');
  console.log('Deployer:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');

  const Factory = await ethers.getContractFactory('BlackjackLeaderboard');
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('\n✅ BlackjackLeaderboard deployed to:', address);
  console.log('🔗 View on Basescan: https://basescan.org/address/' + address);
  console.log('\nNext step — add to frontend/.env.local:');
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
