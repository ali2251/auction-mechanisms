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
      .withArgs(
        users[0].address,
        SampleERC721.address,
        1,
        24 * 60 * 60, // 24 hours
        15 * 60, // 15 minutes
        1,
        0
      );
  });

  it('can create a bid for reserve auction', async function () {
    const {users, NFTMarketReserveAuction, SampleERC721} = await setup();

    await users[0].SampleERC721.mint(users[0].address, 1);
    await users[0].SampleERC721.approve(NFTMarketReserveAuction.address, 1);

    await users[0].NFTMarketReserveAuction.createReserveAuction(
      SampleERC721.address,
      1,
      1
    );
    const timestamp =
      (await ethers.provider.getBlock('latest')).timestamp + 1 + 86400; // 1 second for block, 24 hours for duration
    await expect(users[1].NFTMarketReserveAuction.placeBid(0, {value: 100}))
      .to.emit(NFTMarketReserveAuction, 'ReserveAuctionBidPlaced')
      .withArgs(0, users[1].address, 100, timestamp);
  });

  it('cannot create a bid under reserve price', async function () {
    const {users, NFTMarketReserveAuction, SampleERC721} = await setup();

    await users[0].SampleERC721.mint(users[0].address, 1);
    await users[0].SampleERC721.approve(NFTMarketReserveAuction.address, 1);

    await users[0].NFTMarketReserveAuction.createReserveAuction(
      SampleERC721.address,
      1,
      101
    );

    await expect(
      users[1].NFTMarketReserveAuction.placeBid(0, {value: 100})
    ).to.be.revertedWith(
      'NFTMarketReserveAuction: Bid must be at least the reserve price'
    );
  });
  it('can create multiple bids for reserve auction', async function () {
    const {users, NFTMarketReserveAuction, SampleERC721} = await setup();

    await users[0].SampleERC721.mint(users[0].address, 1);
    await users[0].SampleERC721.approve(NFTMarketReserveAuction.address, 1);

    await users[0].NFTMarketReserveAuction.createReserveAuction(
      SampleERC721.address,
      1,
      1
    );
    const timestamp =
      (await ethers.provider.getBlock('latest')).timestamp + 1 + 86400; // 1 second for block, 24 hours for duration
    await expect(users[1].NFTMarketReserveAuction.placeBid(0, {value: 100}))
      .to.emit(NFTMarketReserveAuction, 'ReserveAuctionBidPlaced')
      .withArgs(0, users[1].address, 100, timestamp);

    await expect(users[2].NFTMarketReserveAuction.placeBid(0, {value: 200}))
      .to.emit(NFTMarketReserveAuction, 'ReserveAuctionBidPlaced')
      .withArgs(0, users[2].address, 200, timestamp);
  });

  it('cannot outbid yourself', async function () {
    const {users, NFTMarketReserveAuction, SampleERC721} = await setup();

    await users[0].SampleERC721.mint(users[0].address, 1);
    await users[0].SampleERC721.approve(NFTMarketReserveAuction.address, 1);

    await users[0].NFTMarketReserveAuction.createReserveAuction(
      SampleERC721.address,
      1,
      1
    );
    const timestamp =
      (await ethers.provider.getBlock('latest')).timestamp + 1 + 86400; // 1 second for block, 24 hours for duration
    await expect(users[1].NFTMarketReserveAuction.placeBid(0, {value: 100}))
      .to.emit(NFTMarketReserveAuction, 'ReserveAuctionBidPlaced')
      .withArgs(0, users[1].address, 100, timestamp);

    await expect(
      users[1].NFTMarketReserveAuction.placeBid(0, {value: 200})
    ).to.be.revertedWith(
      'NFTMarketReserveAuction: You already have an outstanding bid'
    );
  });

  it('bids should be higher than previous one', async function () {
    const {users, NFTMarketReserveAuction, SampleERC721} = await setup();

    await users[0].SampleERC721.mint(users[0].address, 1);
    await users[0].SampleERC721.approve(NFTMarketReserveAuction.address, 1);

    await users[0].NFTMarketReserveAuction.createReserveAuction(
      SampleERC721.address,
      1,
      1
    );
    const timestamp =
      (await ethers.provider.getBlock('latest')).timestamp + 1 + 86400; // 1 second for block, 24 hours for duration
    await expect(users[1].NFTMarketReserveAuction.placeBid(0, {value: 100}))
      .to.emit(NFTMarketReserveAuction, 'ReserveAuctionBidPlaced')
      .withArgs(0, users[1].address, 100, timestamp);

    await expect(
      users[2].NFTMarketReserveAuction.placeBid(0, {value: 100})
    ).to.be.revertedWith('NFTMarketReserveAuction: Bid amount too low');
  });

  it('cant finalize an auction before time', async function () {
    const {users, NFTMarketReserveAuction, SampleERC721} = await setup();

    await users[0].SampleERC721.mint(users[0].address, 1);
    await users[0].SampleERC721.approve(NFTMarketReserveAuction.address, 1);

    await users[0].NFTMarketReserveAuction.createReserveAuction(
      SampleERC721.address,
      1,
      1
    );
    const timestamp =
      (await ethers.provider.getBlock('latest')).timestamp + 1 + 86400; // 1 second for block, 24 hours for duration
    await expect(users[1].NFTMarketReserveAuction.placeBid(0, {value: 100}))
      .to.emit(NFTMarketReserveAuction, 'ReserveAuctionBidPlaced')
      .withArgs(0, users[1].address, 100, timestamp);

    await expect(
      users[2].NFTMarketReserveAuction.finalizeReserveAuction(0)
    ).to.be.revertedWith('NFTMarketReserveAuction: Auction still in progress');
  });

  it('can finalize an auction', async function () {
    const {users, NFTMarketReserveAuction, SampleERC721} = await setup();

    await users[0].SampleERC721.mint(users[0].address, 1);
    await users[0].SampleERC721.approve(NFTMarketReserveAuction.address, 1);

    await users[0].NFTMarketReserveAuction.createReserveAuction(
      SampleERC721.address,
      1,
      1
    );
    const timestamp =
      (await ethers.provider.getBlock('latest')).timestamp + 1 + 86400; // 1 second for block, 24 hours for duration
    await expect(users[1].NFTMarketReserveAuction.placeBid(0, {value: 100}))
      .to.emit(NFTMarketReserveAuction, 'ReserveAuctionBidPlaced')
      .withArgs(0, users[1].address, 100, timestamp);

    await ethers.provider.send('evm_setNextBlockTimestamp', [timestamp + 10]);
    await ethers.provider.send('evm_mine', []);

    await expect(users[2].NFTMarketReserveAuction.finalizeReserveAuction(0))
      .to.emit(NFTMarketReserveAuction, 'ReserveAuctionFinalized')
      .withArgs(0, users[0].address, users[1].address, 0, 0, 100);
  });

  it('can finalize an auction with multiple bids', async function () {
    const {users, NFTMarketReserveAuction, SampleERC721} = await setup();

    await users[0].SampleERC721.mint(users[0].address, 1);
    await users[0].SampleERC721.approve(NFTMarketReserveAuction.address, 1);

    await users[0].NFTMarketReserveAuction.createReserveAuction(
      SampleERC721.address,
      1,
      1
    );
    const timestamp =
      (await ethers.provider.getBlock('latest')).timestamp + 1 + 86400; // 1 second for block, 24 hours for duration
    await expect(users[1].NFTMarketReserveAuction.placeBid(0, {value: 100}))
      .to.emit(NFTMarketReserveAuction, 'ReserveAuctionBidPlaced')
      .withArgs(0, users[1].address, 100, timestamp);

    await expect(users[2].NFTMarketReserveAuction.placeBid(0, {value: 200}))
      .to.emit(NFTMarketReserveAuction, 'ReserveAuctionBidPlaced')
      .withArgs(0, users[2].address, 200, timestamp);

    await expect(users[1].NFTMarketReserveAuction.placeBid(0, {value: 300}))
      .to.emit(NFTMarketReserveAuction, 'ReserveAuctionBidPlaced')
      .withArgs(0, users[1].address, 300, timestamp);

    await expect(users[2].NFTMarketReserveAuction.placeBid(0, {value: 500}))
      .to.emit(NFTMarketReserveAuction, 'ReserveAuctionBidPlaced')
      .withArgs(0, users[2].address, 500, timestamp);

    await ethers.provider.send('evm_setNextBlockTimestamp', [timestamp + 10]);
    await ethers.provider.send('evm_mine', []);

    await expect(users[2].NFTMarketReserveAuction.finalizeReserveAuction(0))
      .to.emit(NFTMarketReserveAuction, 'ReserveAuctionFinalized')
      .withArgs(0, users[0].address, users[2].address, 0, 0, 500);
  });

  it('cant place a bid after auction is finalized', async function () {
    const {users, NFTMarketReserveAuction, SampleERC721} = await setup();

    await users[0].SampleERC721.mint(users[0].address, 1);
    await users[0].SampleERC721.approve(NFTMarketReserveAuction.address, 1);

    await users[0].NFTMarketReserveAuction.createReserveAuction(
      SampleERC721.address,
      1,
      1
    );
    const timestamp =
      (await ethers.provider.getBlock('latest')).timestamp + 1 + 86400; // 1 second for block, 24 hours for duration
    await expect(users[1].NFTMarketReserveAuction.placeBid(0, {value: 100}))
      .to.emit(NFTMarketReserveAuction, 'ReserveAuctionBidPlaced')
      .withArgs(0, users[1].address, 100, timestamp);

    await ethers.provider.send('evm_setNextBlockTimestamp', [timestamp + 10]);
    await ethers.provider.send('evm_mine', []);

    await expect(
      users[2].NFTMarketReserveAuction.placeBid(0, {value: 500})
    ).to.be.revertedWith('NFTMarketReserveAuction: Auction is over');

    await expect(users[2].NFTMarketReserveAuction.finalizeReserveAuction(0))
      .to.emit(NFTMarketReserveAuction, 'ReserveAuctionFinalized')
      .withArgs(0, users[0].address, users[1].address, 0, 0, 100);
  });

  it('auction gets deleted after being finalized', async function () {
    const {users, NFTMarketReserveAuction, SampleERC721} = await setup();

    await users[0].SampleERC721.mint(users[0].address, 1);
    await users[0].SampleERC721.approve(NFTMarketReserveAuction.address, 1);

    await users[0].NFTMarketReserveAuction.createReserveAuction(
      SampleERC721.address,
      1,
      1
    );
    const timestamp =
      (await ethers.provider.getBlock('latest')).timestamp + 1 + 86400; // 1 second for block, 24 hours for duration
    await expect(users[1].NFTMarketReserveAuction.placeBid(0, {value: 100}))
      .to.emit(NFTMarketReserveAuction, 'ReserveAuctionBidPlaced')
      .withArgs(0, users[1].address, 100, timestamp);

    await ethers.provider.send('evm_setNextBlockTimestamp', [timestamp + 10]);
    await ethers.provider.send('evm_mine', []);

    await expect(users[2].NFTMarketReserveAuction.finalizeReserveAuction(0))
      .to.emit(NFTMarketReserveAuction, 'ReserveAuctionFinalized')
      .withArgs(0, users[0].address, users[1].address, 0, 0, 100);

    await expect(
      users[2].NFTMarketReserveAuction.placeBid(0, {value: 500})
    ).to.be.revertedWith('NFTMarketReserveAuction: Auction not found');
  });
});
