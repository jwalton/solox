import { createDraft, Draft, finishDraft, Immutable, produce } from 'immer';
import { useEffect, useRef, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Objectish = { [key: string]: any } | unknown[];

/**
 * Keep track of immutable state in a controller.
 */
export class ImmutableModelStore<S extends Objectish> {
    /** The current state for this store. */
    public current: Immutable<S>;

    // If we are in the middle of an update, this is the draft that is being updated.
    private _isUpdating: Draft<Immutable<S>> | undefined;

    // A list of subscribers to this store.
    private _subscribers: ((newValue: Immutable<S>) => void)[] = [];

    /**
     * Create a new ImmutableModelStore.
     */
    constructor(initialState: Immutable<S>) {
        this.current = produce(initialState, () => void 0);
    }

    public get updating(): boolean {
        return !!this._isUpdating;
    }

    /**
     * update() will synchronously update the state of the model.
     *
     * @param update - If `update` is an object, then any properties defined in the object
     * will be copied into the current state.
     *
     * If `update` is a synchronous function, the function will be passed a
     * mutable version of the state, which can be edited directly.  Updates will
     * be applied when `fn` returns.  Recursive/nested calls to  `update` will be
     * handled correctly.
     */
    public update(update: Partial<S> | ((state: Draft<Immutable<S>>) => void)): void {
        if (typeof update !== 'function') {
            const obj = update;
            update = (state) => {
                Object.assign(state, obj);
            };
        }

        if (this._isUpdating) {
            update(this._isUpdating);
        } else {
            const draft = (this._isUpdating = createDraft(this.current));

            try {
                // Apply the update...
                const voidResult = update(draft);

                // Paranoid check for async functions...
                if (typeof voidResult === 'object' && 'then' in voidResult) {
                    throw new Error('Updates must be synchronous');
                }

                const newState = finishDraft(draft) as Immutable<S>;

                this._isUpdating = undefined;
                if (newState !== this.current) {
                    this.current = newState;

                    // Notify subscribers.
                    this._subscribers.forEach((subscriber) => subscriber(this.current));
                }
            } finally {
                this._isUpdating = undefined;
            }
        }
    }

    /**
     * Subscribe to changes in this store's state.
     *
     * @param subscriber The function to call when the state changes.
     * @returns a function to call to unsubscribe.
     */
    public subscribe(subscriber: (newState: Immutable<S>) => void): () => void {
        this._subscribers.push(subscriber);

        return () => {
            this._subscribers = this._subscribers.filter((s) => s !== subscriber);
        };
    }
}

/**
 * Convenience hook for creating a new controller.
 */
export function useLocalController<T>(initializer: () => T): T {
    const [controller] = useState<T>(initializer);
    return controller;
}

/**
 * Returns a ref to the passed in object that updates whenever the passed in object
 * changes.  This is handy when you want to create a callback, and you don't want
 * the callback to change because a value it depends on changes.
 *
 * @returns [ref, changed]
 */
function useLatest<T>(thing: T): [React.MutableRefObject<T>, boolean] {
    const ref = useRef<T>(thing);
    const changed = ref.current !== thing;
    ref.current = thing;
    return [ref, changed];
}

/**
 * Selector hook for fetching state from a controller.
 *
 * @param store - The store to fetch state from.
 * @param [selector] - A function that takes the state and returns the value or values
 *   to be returned by `useControllerState()`.  `useControllerState()` will only
 *   re-render the component if the returned value changes.
 * @param [isEqual] - By default, the results of subsequent calls to `selector()`
 *   will be compared using `===`. If this is provided, this function will be
 *   used instead.
 */
export function useControllerState<S extends Objectish, R = Immutable<S>>(
    store: ImmutableModelStore<S>,
    selector?: (state: Immutable<S>) => R,
    isEqual?: (oldState: R, newState: R) => boolean
): R {
    // Keep track of the "latest" selector and isEqual so we don't have to
    // unsubscribe/resubscribe if they change.
    const [latestSelector, selectorChanged] = useLatest(selector || defaultSelector);
    const [latestIsEqual] = useLatest(isEqual || defaultIsEqual);

    // Hold the selected result in a ref - if the selector changes, we want to update
    // the result without forcing another re-render.
    const resultRef = useRef<R>(latestSelector.current(store.current));

    // The currently selected state, used to force a re-render.
    const [, setResult] = useState<R>(() => latestSelector.current(store.current));

    // If the selector changes, may need to update the selected result.
    if (selectorChanged) {
        const newResult = latestSelector.current(store.current);
        if (!latestIsEqual.current(resultRef.current, newResult)) {
            resultRef.current = newResult;
        }
    }

    // Update resultRef and force a re-render if the store changes.
    useEffect(
        () =>
            store.subscribe((state: Immutable<S>) => {
                const newResult = latestSelector.current(state);
                if (!latestIsEqual.current(resultRef.current, newResult)) {
                    resultRef.current = newResult;
                    setResult(newResult);
                }
            }),
        [latestIsEqual, latestSelector, store]
    );

    return resultRef.current;
}

function defaultSelector<S, R>(state: Immutable<S>): R {
    return state as unknown as R;
}

function defaultIsEqual<R>(oldState: R, newState: R): boolean {
    return oldState === newState;
}
