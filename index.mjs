import { loadStdlib } from "@reach-sh/stdlib";
import * as backend from "./build/index.main.mjs";

const stdlib = loadStdlib(process.env);

(async () => {
  const startingBalance = stdlib.parseCurrency(10);
  const accAlice = await stdlib.newTestAccount(startingBalance);
  const accBob = await stdlib.newTestAccount(startingBalance);

  const fmt = (x) => stdlib.formatCurrency(x, 4);
  const getBalance = async (who) => fmt(await stdlib.balanceOf(who));

  const beforeAlice = await getBalance(accAlice);
  const beforeBob = await getBalance(accBob);

  const ctcAlice = accAlice.contract(backend);
  const ctcBob = accBob.contract(backend, ctcAlice.getInfo());

  const HAND = ["Rock", "Paper", "Scissors"];
  const OUTCOME = ["Bob wins", "Draw", "Alice wins"];

  const Player = (Who) => ({
    ...stdlib.hasRandom,
    getHand: () => {
      const hand = Math.floor(Math.random() * HAND.length);
      console.log(`${Who} played ${HAND[hand]}`);
      return hand;
    },
    seeOutcome: (outcome) => {
      console.log(`${Who} saw outcome ${OUTCOME[outcome]}`);
    },
    informTimeout: () => {
      console.log(`${Who} observed a timeout`);
    },
  });
  await Promise.all([
    backend.Alice(ctcAlice, {
      ...Player("Alice"),
      wager: stdlib.parseCurrency(5),
      deadline: 10,
    }),

    backend.Bob(ctcBob, {
      ...Player("Bob"),
      acceptWager: async (amt) => {
        if (Math.random() <= 0.5) {
          // timeout bob
          for (let i = 0; i < 10; i++) {
            console.log(` Bob takes his sweet time... `);
            await stdlib.wait(1);
          }
        } else {
          console.log(`Bob accepted wager ${fmt(amt)}`);
        }
      }
    }),
  ]);

  const afterAlice = await getBalance(accAlice);
  const afterBob = await getBalance(accBob);

  console.log(`Alice: ${beforeAlice} -> ${afterAlice}`);
  console.log(`Bob: ${beforeBob} -> ${afterBob}`);
})();
