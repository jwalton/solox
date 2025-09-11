import * as chai from 'chai';
import { describe, it } from 'vitest';
import { ImmutableModelStore } from './index.js';

const { expect } = chai;

describe('ImmutableModelStore', () => {
    it('should update state', () => {
        const store = new ImmutableModelStore({ name: 'Jason', age: 30 });
        const intialState = store.current;

        store.update((state) => {
            state.age = 31;
        });

        expect(intialState).to.eql({ name: 'Jason', age: 30 });
        expect(store.current).to.eql({ name: 'Jason', age: 31 });
    });

    it('should update state via an object', () => {
        const store = new ImmutableModelStore({ name: 'Jason', age: 30 });
        const intialState = store.current;

        store.update({ age: 31 });

        expect(intialState).to.eql({ name: 'Jason', age: 30 });
        expect(store.current).to.eql({ name: 'Jason', age: 31 });
    });

    it('should allow nested updates', () => {
        const store = new ImmutableModelStore({ name: 'Jason', age: 30 });
        store.update((state) => {
            store.update((state) => {
                state.age = 31;
            });
            state.name = 'Oriana';
        });

        expect(store.current).to.eql({ name: 'Oriana', age: 31 });
    });

    it('should notify a subscriber when the store changes', () => {
        const store = new ImmutableModelStore({ name: 'Jason', age: 30 });

        const calls: unknown[][] = [];
        const listener = (...args: unknown[]) => {
            calls.push(args);
        };

        store.subscribe(listener);

        expect(calls.length).to.equal(0);

        store.update((state) => {
            state.age = 31;
        });

        expect(calls.length).to.equal(1);
        expect(calls[0][0]).to.eql({ name: 'Jason', age: 31 });
    });

    it('should have consistent state when notifying a subscriber', () => {
        const store = new ImmutableModelStore({ name: 'Jason', age: 30 });

        store.subscribe((state) => {
            // When calling a subscriber, we should be able to get the state
            // from the passed in value or from the store, and it should be
            // the same.
            expect(state).to.equal(store.current);
        });

        store.update((state) => {
            state.age = 31;
        });
    });

    it('should unsubscribe from a store', () => {
        const store = new ImmutableModelStore({ name: 'Jason', age: 30 });

        let calls = 0;
        const listener = () => {
            calls += 1;
        };

        const unsubscribe = store.subscribe(listener);

        expect(calls).to.equal(0);

        store.update((state) => {
            state.age = 31;
        });
        expect(calls).to.equal(1);

        unsubscribe();
        store.update((state) => {
            state.age = 31;
        });
        expect(calls).to.equal(1);
    });

    it('should handle an exception from update', () => {
        const store = new ImmutableModelStore({ name: 'Jason', age: 30 });

        expect(() =>
            store.update((state) => {
                state.age = 31;
                throw new Error('boom');
            })
        ).to.throw('boom');

        // Update should not have been applied.
        expect(store.current.age).to.equal(30);

        // We should not be in the middle of a re-rentrant update.
        expect(store.updating).to.be.false;
    });

    it('should accept various types of objects', () => {
        new ImmutableModelStore({ obj: true });
        new ImmutableModelStore([1, 2, 3]);
    });

    it('should allow explicit types', () => {
        interface Person {
            name: string;
            age: number;
        }

        const store = new ImmutableModelStore<Person>({ name: 'Jason', age: 30 });
        store.update((state: Person) => {
            state.name = 'Oriana';
        });

        expect(store.current).to.eql({ name: 'Oriana', age: 30 });
    });
});
