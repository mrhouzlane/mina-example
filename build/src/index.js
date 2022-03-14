var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import * as readline from 'readline';
import { Field, PublicKey, SmartContract, state, State, isReady, Mina, Party, PrivateKey, method, UInt64, shutdown, Poseidon, Signature, } from 'snarkyjs';
export class Guess extends SmartContract {
    constructor() {
        super(...arguments);
        this.hashOfGuess = State();
        this.ownerAddr = State();
    }
    deploy(initialbalance, ownerAddr) {
        super.deploy();
        this.ownerAddr.set(ownerAddr);
        this.balance.addInPlace(initialbalance);
    }
    async startRound(x, signature, guess) {
        let ownerAddr = await this.ownerAddr.get();
        signature.verify(ownerAddr, [x]).assertEquals(true);
        this.hashOfGuess.set(Poseidon.hash([Field(guess)]));
    }
    async submitGuess(guess) {
        let userHash = Poseidon.hash([Field(guess)]);
        let stateHash = await this.hashOfGuess.get();
        stateHash.assertEquals(userHash);
    }
    async guessMultiplied(guess, result) {
        let userHash = Poseidon.hash([Field(guess)]);
        let stateHash = await this.hashOfGuess.get();
        stateHash.assertEquals(userHash);
        Field(result).assertEquals(Field(guess).mul(Field(3)));
        this.balance.subInPlace(UInt64.fromNumber(100));
    }
}
__decorate([
    state(Field),
    __metadata("design:type", Object)
], Guess.prototype, "hashOfGuess", void 0);
__decorate([
    state(PublicKey),
    __metadata("design:type", Object)
], Guess.prototype, "ownerAddr", void 0);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Field, Signature, Number]),
    __metadata("design:returntype", Promise)
], Guess.prototype, "startRound", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], Guess.prototype, "submitGuess", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], Guess.prototype, "guessMultiplied", null);
export async function run() {
    await isReady;
    const Local = Mina.LocalBlockchain();
    Mina.setActiveInstance(Local);
    const account1 = Local.testAccounts[0].privateKey;
    const account2 = Local.testAccounts[1].privateKey;
    const snappPrivkey = PrivateKey.random();
    const snappPubkey = snappPrivkey.toPublicKey();
    let snappInstance;
    await Mina.transaction(account1, async () => {
        // account2 sends 1000000000 to the new snapp account
        const amount = UInt64.fromNumber(1000000000);
        const p = await Party.createSigned(account2);
        p.balance.subInPlace(amount);
        snappInstance = new Guess(snappPubkey);
        snappInstance.deploy(amount, account1.toPublicKey());
    })
        .send()
        .wait();
    // const a = await Mina.getAccount(snappPubkey);
    console.log('snapp balance after deployment: ', (await Mina.getBalance(snappPubkey)).toString());
    let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    console.log('Owner starts the round');
    rl.question('what should be the secret number? \n', async (answer) => {
        let guess = Number(answer);
        rl.close();
        await Mina.transaction(account1, async () => {
            const x = Field.zero;
            const signature = Signature.create(account1, [x]);
            await snappInstance.startRound(x, signature, guess);
        })
            .send()
            .wait();
        let r2 = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        console.log('Switching to user 2 in 3 sec...');
        await sleep(1000);
        console.log('2 sec ...');
        await sleep(1000);
        console.log('1 sec ...');
        await sleep(1000);
        console.clear();
        const a = await Mina.getAccount(snappPubkey);
        console.log('User 2 starting balance  ', (await Mina.getBalance(account2.toPublicKey())).toString());
        console.log('hash of the guess is:', a.snapp.appState[0].toString());
        r2.question('Hey user2, what is your guess? \n', async (userAnswer) => {
            let answer = Number(userAnswer);
            try {
                await Mina.transaction(account2, async () => {
                    await snappInstance.submitGuess(answer);
                })
                    .send()
                    .wait();
                r2.close();
                console.log('Correct guess but ...');
            }
            catch {
                r2.close();
                console.log('Wrong guess!!');
                throw new Error();
            }
            let r3 = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });
            console.log('Validate that you are not a robot 🤖🤖🤖');
            r3.question('your guess multiplied by 3 is : \n', async (value) => {
                try {
                    let valueNumber = Number(value);
                    await Mina.transaction(account2, async () => {
                        await snappInstance.guessMultiplied(answer, valueNumber);
                        const amount = UInt64.fromNumber(100);
                        const p = Party.createUnsigned(account2.toPublicKey());
                        p.balance.addInPlace(amount);
                    })
                        .send()
                        .wait();
                    console.log('correct!');
                    console.log('User 2 balance after correct guess ', (await Mina.getBalance(account2.toPublicKey())).toString());
                    console.log('snapp balance after payout: ', (await Mina.getBalance(snappPubkey)).toString());
                    r3.close();
                }
                catch (e) {
                    console.log(e);
                    console.log("wrong, you're a robot!");
                    r3.close();
                }
            });
        });
    });
}
run();
shutdown();
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
