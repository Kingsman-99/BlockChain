import { expect } from "chai";
import { network } from "hardhat";

// Hardhat v3 uses ESM; connect to the in-process network to access ethers.
const { ethers } = await network.connect();

describe("TimeLockVault", function () {
  // Deploys a clean vault instance for each test case.
  async function deployFixture() {
    const [user, other] = await ethers.getSigners();
    const TimeLockVault = await ethers.getContractFactory("TimeLockVault", user);
    const vault = await TimeLockVault.deploy();
    return { vault, user, other };
  }

  it("accepts a deposit with a future unlock time", async function () {
    const { vault, user } = await deployFixture();
    const { timestamp } = await ethers.provider.getBlock("latest");
    const unlockTime = timestamp + 3600;
    const amount = ethers.parseEther("1");

    await expect(vault.connect(user).deposit(unlockTime, { value: amount }))
      .to.emit(vault, "Deposited")
      .withArgs(user.address, amount, unlockTime);
  });

  it("rejects zero-value deposits", async function () {
    const { vault, user } = await deployFixture();
    const { timestamp } = await ethers.provider.getBlock("latest");
    const unlockTime = timestamp + 3600;

    await expect(vault.connect(user).deposit(unlockTime, { value: 0n }))
      .to.be.revertedWithCustomError(vault, "ZeroDeposit");
  });

  it("rejects unlock time in the past", async function () {
    const { vault, user } = await deployFixture();
    const { timestamp } = await ethers.provider.getBlock("latest");
    const unlockTime = timestamp - 1;

    await expect(vault.connect(user).deposit(unlockTime, { value: 1n }))
      .to.be.revertedWithCustomError(vault, "UnlockTimeInPast");
  });

  it("prevents a second deposit while active", async function () {
    const { vault, user } = await deployFixture();
    const { timestamp } = await ethers.provider.getBlock("latest");
    const unlockTime = timestamp + 3600;

    await vault.connect(user).deposit(unlockTime, { value: 1n });
    await expect(vault.connect(user).deposit(unlockTime + 10, { value: 1n }))
      .to.be.revertedWithCustomError(vault, "ActiveVaultExists");
  });

  it("prevents early withdrawal", async function () {
    const { vault, user } = await deployFixture();
    const { timestamp } = await ethers.provider.getBlock("latest");
    const unlockTime = timestamp + 3600;

    await vault.connect(user).deposit(unlockTime, { value: 1n });
    await expect(vault.connect(user).withdraw())
      .to.be.revertedWithCustomError(vault, "TooEarly");
  });

  it("allows full withdrawal after unlock time and resets vault", async function () {
    const { vault, user } = await deployFixture();
    const latest = await ethers.provider.getBlock("latest");
    const unlockTime = latest.timestamp + 10;
    const amount = ethers.parseEther("1");

    await vault.connect(user).deposit(unlockTime, { value: amount });

    // Fast-forward time to satisfy the timelock requirement.
    await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime]);
    await ethers.provider.send("evm_mine", []);

    await expect(vault.connect(user).withdraw())
      .to.emit(vault, "Withdrawn")
      .withArgs(user.address, amount);

    const vaultData = await vault.vaults(user.address);
    expect(vaultData.active).to.equal(false);
    expect(vaultData.amount).to.equal(0n);
  });

  it("prevents withdrawing another user's funds", async function () {
    const { vault, user, other } = await deployFixture();
    const { timestamp } = await ethers.provider.getBlock("latest");
    const unlockTime = timestamp + 3600;

    await vault.connect(user).deposit(unlockTime, { value: 1n });
    await expect(vault.connect(other).withdraw())
      .to.be.revertedWithCustomError(vault, "NoActiveVault");
  });

  it("rejects direct ETH transfers", async function () {
    const { vault, user } = await deployFixture();

    await expect(user.sendTransaction({ to: await vault.getAddress(), value: 1n }))
      .to.be.revertedWithCustomError(vault, "DirectTransferNotAllowed");
  });
});
