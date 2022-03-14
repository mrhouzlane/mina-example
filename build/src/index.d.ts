import { Field, PublicKey, SmartContract, State, UInt64, Signature } from 'snarkyjs';
export declare class Guess extends SmartContract {
    hashOfGuess: State<Field>;
    ownerAddr: State<PublicKey>;
    deploy(initialbalance: UInt64, ownerAddr: PublicKey): void;
    startRound(x: Field, signature: Signature, guess: number): Promise<void>;
    submitGuess(guess: number): Promise<void>;
    guessMultiplied(guess: number, result: number): Promise<void>;
}
export declare function run(): Promise<void>;
