import { expect } from "chai";
import { network } from "hardhat";

// Hardhat v3 uses ESM; connect to the in-process network to access ethers.
const { ethers } = await network.connect();

describe("Crowdfunding", function () {
  // Deploy a new campaign for each test case.
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const goal = ethers.parseEther("5");
    const duration = 3600; // 1 hour

    const Crowdfunding = await ethers.getContractFactory("Crowdfunding", owner);
    const campaign = await Crowdfunding.deploy(goal, duration);

    return { campaign, owner, alice, bob, goal, duration };
  }

  it("accepts contributions before the deadline", async function () {
    const { campaign, alice } = await deployFixture();
    const amount = ethers.parseEther("1");

    await expect(campaign.connect(alice).contribute({ value: amount }))
      .to.emit(campaign, "Contributed")
      .withArgs(alice.address, amount);
  });

  it("rejects zero contributions", async function () {
    const { campaign, alice } = await deployFixture();

    await expect(campaign.connect(alice).contribute({ value: 0n }))
      .to.be.revertedWithCustomError(campaign, "ZeroContribution");
  });

  it("allows owner withdrawal when goal is met after deadline", async function () {
    const { campaign, owner, alice, bob, goal } = await deployFixture();

    await campaign.connect(alice).contribute({ value: ethers.parseEther("3") });
    await campaign.connect(bob).contribute({ value: ethers.parseEther("2") });

    // Fast-forward past the deadline to enable withdrawal.
    const latest = await ethers.provider.getBlock("latest");
    await ethers.provider.send("evm_setNextBlockTimestamp", [latest.timestamp + 4000]);
    await ethers.provider.send("evm_mine", []);

    await expect(campaign.connect(owner).withdraw())
      .to.emit(campaign, "Withdrawn")
      .withArgs(owner.address, goal);
  });

  it("prevents owner withdrawal if goal not met", async function () {
    const { campaign, owner, alice } = await deployFixture();

    await campaign.connect(alice).contribute({ value: ethers.parseEther("1") });

    // Fast-forward past the deadline to enforce post-deadline rules.
    const latest = await ethers.provider.getBlock("latest");
    await ethers.provider.send("evm_setNextBlockTimestamp", [latest.timestamp + 4000]);
    await ethers.provider.send("evm_mine", []);

    await expect(campaign.connect(owner).withdraw())
      .to.be.revertedWithCustomError(campaign, "GoalNotMet");
  });

  it("allows refunds after deadline if goal not met", async function () {
    const { campaign, alice } = await deployFixture();
    const amount = ethers.parseEther("1");

    await campaign.connect(alice).contribute({ value: amount });

    // Move time forward so refunds become available.
    const latest = await ethers.provider.getBlock("latest");
    await ethers.provider.send("evm_setNextBlockTimestamp", [latest.timestamp + 4000]);
    await ethers.provider.send("evm_mine", []);

    await expect(campaign.connect(alice).refund())
      .to.emit(campaign, "Refunded")
      .withArgs(alice.address, amount);
  });

  it("prevents double refunds", async function () {
    const { campaign, alice } = await deployFixture();
    const amount = ethers.parseEther("1");

    await campaign.connect(alice).contribute({ value: amount });

    // Move time forward so refunds become available.
    const latest = await ethers.provider.getBlock("latest");
    await ethers.provider.send("evm_setNextBlockTimestamp", [latest.timestamp + 4000]);
    await ethers.provider.send("evm_mine", []);

    await campaign.connect(alice).refund();
    await expect(campaign.connect(alice).refund())
      .to.be.revertedWithCustomError(campaign, "AlreadyRefunded");
  });

  it("prevents refunds if goal met", async function () {
    const { campaign, alice, bob } = await deployFixture();

    await campaign.connect(alice).contribute({ value: ethers.parseEther("3") });
    await campaign.connect(bob).contribute({ value: ethers.parseEther("2") });

    // Move time forward so refund attempts occur after the deadline.
    const latest = await ethers.provider.getBlock("latest");
    await ethers.provider.send("evm_setNextBlockTimestamp", [latest.timestamp + 4000]);
    await ethers.provider.send("evm_mine", []);

    await expect(campaign.connect(alice).refund())
      .to.be.revertedWithCustomError(campaign, "GoalMet");
  });
});
