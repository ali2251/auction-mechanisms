import {expect} from './chai-setup';
import {ethers, deployments, getUnnamedAccounts} from 'hardhat';
import {NFTMarketReserveAuction} from '../typechain';
import {setupUsers} from './utils';
import {SampleERC721} from '../typechain/SampleERC721';

const setup = deployments.createFixture(async () => {
  await deployments.fixture('NFTMarketReserveAuction');
  const contracts = {
    NFTMarketReserveAuction: <NFTMarketReserveAuction>(
      await ethers.getContract('NFTMarketReserveAuction')
    ),
    SampleERC721: <SampleERC721>await ethers.getContract('SampleERC721'),
  };
  const users = await setupUsers(await getUnnamedAccounts(), contracts);
  return {
    ...contracts,
    users,
  };
});

describe('NFTMarketReserveAuction', function () {
  it('can create a reserve auction', async function () {
    const {users, NFTMarketReserveAuction, SampleERC721} = await setup();

    await users[0].SampleERC721.mint(users[0].address, 1);
    await users[0].SampleERC721.approve(NFTMarketReserveAuction.address, 1);

    await expect(
      users[0].NFTMarketReserveAuction.createReserveAuction(
        SampleERC721.address,
        1,
        1
      )
    )
      .to.emit(NFTMarketReserveAuction, 'ReserveAuctionCreated')
      .withArgs(users[0].address, SampleERC721.address, 1, 0, 15 * 60, 1, 0);
  });
});
