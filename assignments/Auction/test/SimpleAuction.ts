import { expect } from "chai";
import { network } from "hardhat";

// Hardhat v3 uses ESM; connect to the in-process network to access ethers.
// Hardhat v3 uses ESM; connect to the in-process network to access ethers.
const { ethers } = await network.connect();

describe("SimpleAuction", function () {
  // Deploy a fresh auction for each test.
  // Deploy a new auction for each test case.
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const startingPrice = ethers.parseEther("1");
    const duration = 3600; // 1 hour

    const SimpleAuction = await ethers.getContractFactory("SimpleAuction", owner);
    const auction = await SimpleAuction.deploy(startingPrice, duration);

    return { auction, owner, alice, bob, startingPrice, duration };
  }

  it("accepts a valid bid higher than the starting price", async function () {
    const { auction, alice } = await deployFixture();
    const bid = ethers.parseEther("2");

    await expect(auction.connect(alice).bid({ value: bid }))
      .to.emit(auction, "BidPlaced")
      .withArgs(alice.address, bid);
  });

  it("rejects bids that are not higher than the current highest", async function () {
    const { auction, alice } = await deployFixture();
    const bid = ethers.parseEther("1");

    await expect(auction.connect(alice).bid({ value: bid }))
      .to.be.revertedWithCustomError(auction, "BidTooLow");
  });

  it("prevents the owner from bidding", async function () {
    const { auction, owner } = await deployFixture();

    await expect(auction.connect(owner).bid({ value: ethers.parseEther("2") }))
      .to.be.revertedWithCustomError(auction, "OwnerCannotBid");
  });

  it("tracks refundable balances for outbid bidders", async function () {
    const { auction, alice, bob } = await deployFixture();
    const bid1 = ethers.parseEther("2");
    const bid2 = ethers.parseEther("3");

    await auction.connect(alice).bid({ value: bid1 });
    await auction.connect(bob).bid({ value: bid2 });

    expect(await auction.pendingRefunds(alice.address)).to.equal(bid1);
  });

  it("allows outbid users to withdraw refunds", async function () {
    const { auction, alice, bob } = await deployFixture();
    const bid1 = ethers.parseEther("2");
    const bid2 = ethers.parseEther("3");

    await auction.connect(alice).bid({ value: bid1 });
    await auction.connect(bob).bid({ value: bid2 });

    await expect(auction.connect(alice).withdrawRefund())
      .to.emit(auction, "Refunded")
      .withArgs(alice.address, bid1);
  });

  it("prevents bidding after the auction ends", async function () {
    const { auction, alice } = await deployFixture();

    // Fast-forward beyond the auction end time.
    const latest = await ethers.provider.getBlock("latest");
    await ethers.provider.send("evm_setNextBlockTimestamp", [latest.timestamp + 4000]);
    await ethers.provider.send("evm_mine", []);

    await expect(auction.connect(alice).bid({ value: ethers.parseEther("2") }))
      .to.be.revertedWithCustomError(auction, "AuctionHasEnded");
  });

  it("allows only owner to end auction after duration", async function () {
    const { auction, owner, alice } = await deployFixture();
    const bid = ethers.parseEther("2");

    await auction.connect(alice).bid({ value: bid });

    // Fast-forward beyond the auction end time.
    const latest = await ethers.provider.getBlock("latest");
    await ethers.provider.send("evm_setNextBlockTimestamp", [latest.timestamp + 4000]);
    await ethers.provider.send("evm_mine", []);

    await expect(auction.connect(owner).endAuction())
      .to.emit(auction, "AuctionFinalized")
      .withArgs(alice.address, bid);
  });

  it("prevents ending the auction twice", async function () {
    const { auction, owner, alice } = await deployFixture();
    const bid = ethers.parseEther("2");

    await auction.connect(alice).bid({ value: bid });

    // Fast-forward beyond the auction end time.
    const latest = await ethers.provider.getBlock("latest");
    await ethers.provider.send("evm_setNextBlockTimestamp", [latest.timestamp + 4000]);
    await ethers.provider.send("evm_mine", []);

    await auction.connect(owner).endAuction();
    await expect(auction.connect(owner).endAuction())
      .to.be.revertedWithCustomError(auction, "AlreadyEnded");
  });
});
