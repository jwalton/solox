/**
 * @jest-environment node
 */

import chai from 'chai';
import chaiJest from 'chai-jest';
import { ImmutableModelStore } from '../src/index';
chai.use(chaiJest);

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
        const listener = jest.fn();
        store.subscribe(listener);

        expect(listener).to.not.have.beenCalled;

        store.update((state) => {
            state.age = 31;
        });

        expect(listener).to.have.beenCalledTimes(1);
        expect(listener).to.have.beenCalledWith({ name: 'Jason', age: 31 });
    });

    it('should unsubscribe from a store', () => {
        const store = new ImmutableModelStore({ name: 'Jason', age: 30 });
        const listener = jest.fn();
        const unsubscribe = store.subscribe(listener);

        expect(listener).to.not.have.beenCalled;

        store.update((state) => {
            state.age = 31;
        });
        expect(listener).to.have.beenCalledTimes(1);

        unsubscribe();
        store.update((state) => {
            state.age = 31;
        });
        expect(listener).to.have.beenCalledTimes(1);
    });
});
