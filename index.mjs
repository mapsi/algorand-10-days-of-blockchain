import { loadStdlib } from "@reach-sh/stdlib";
import * as backend from "./build/index.main.mjs";
import { ask, yesno, done } from "@reach-sh/stdlib/ask.mjs";
const stdlib = loadStdlib(process.env);

(async () => {
  stdlib.setProviderByName("TestNet");

  const isAlice = await ask("Are you Alice?", yesno);

  const who = isAlice ? "Alice" : "Bob";
  console.log(`Starting Rock, Paper, Scissors! as ${who}`);

  const mnemonic = await ask("What is your account mnemonic?", (x) => x);

  const acc = await stdlib.newAccountFromMnemonic(mnemonic);

  let ctc = null;
  const deployCtc = await ask(
    "Do you want to deploy the contract (y/n)?",
    yesno
  );

  if (deployCtc) {
    ctc = acc.contract(backend);
    // cannot await here as it might result to a deadlock
    // https://docs.reach.sh/frontend/#js_getInfo
    ctc.getInfo().then((info) => {
      console.log(`The contract is deployed as = ${JSON.parse(info)}`);
    });
  } else {
    const info = await ask(
      "Please paste the contract information:",
      JSON.parse
    );
    ctc = acc.contract(backend, info);
  }

  const fmt = (x) => stdlib.formatCurrency(x, 4);
  const getBalance = async () => fmt(await stdlib.balanceOf(acc));

  const before = await getBalance();
  console.log(`Your balance is ${before}`);

  const interact = { ...stdlib.hasRandom };

  interact.informTimeout = () => {
    console.log("There was a timeout!");
    process.exit(1);
  };

  if (isAlice) {
    const amt = await ask(
      "How much do you want to wager?",
      stdlib.parseCurrency
    );
    interact.wager = amt;
    interact.deadline = { ETH: 100, ALGO: 100, CFX: 1000 }[stdlib.connector];
  } else {
    interact.acceptWager = async (amt) => {
      const accepted = await ask(
        `Do you accept the wager of ${fmt(amt)}?`,
        yesno
      );
      if (!accepted) {
        process.exit(0);
      }
    };
  }

  const HAND = ["Rock", "Paper", "Scissors"];
  const HANDS = {
    Rock: 0,
    R: 0,
    r: 0,
    Paper: 1,
    P: 1,
    p: 1,
    Scissors: 2,
    S: 2,
    s: 2,
  };

  interact.getHand = async () => {
    const hand = await ask("What hand will you play?", (x) => {
      const playerHand = HANDS[x];
      if (playerHand == null) {
        throw new Error(`Invalid hand: ${x}`);
      }
      return playerHand;
    });
    console.log(`You played ${HAND[hand]}`);
    return hand;
  };

  const OUTCOME = ["Bob wins", "Draw", "Alice wins"];

  interact.seeOutcome = async (outcome) => {
    console.log(`The outcome was ${OUTCOME[outcome]}`);
  };

  const part = isAlice ? backend.Alice : backend.Bob;

  await part(ctc, interact);

  const after = await getBalance();
  console.log(`Your balance is now ${after}`);

  done();
})();
