# SoloX

[![NPM version](https://badge.fury.io/js/solox.svg)](https://npmjs.org/package/solox)
![Build Status](https://github.com/jwalton/solox/workflows/GitHub%20CI/badge.svg)
[![Minzipped size](https://img.shields.io/bundlephobia/minzip/use-css-transition.svg)](https://bundlephobia.com/result?p=use-css-transition)

## What is it?

SoloX is a React state management library that focuses on:

- Immutable data
- No/minimal boilerplate
- Low learning curve
- Does not dictate architecture
- Results are highly testable
- Native typescript support

If you're familiar with MobX, this library "feels" a lot like it. You might call it a "poor man's MobX", or perhaps a "MobX superlegerra". The upside is that this library is increadibly small (doubly so if you're already using immer, it's only dependency) and easy to use, and you don't need to worry about wrapping your React components with `observer` higher-order components as you would in MobX. The biggest downside is that you need to be a bit more explicit about when you want to update state, but thanks to the [immer library](https://immerjs.github.io/immer/), updates will still be done as if the state is a regular mutable javascript object.

## How It Works

If you're interested in the implementation details of SoloX, they're documented in [this blog post](TODO). The source code is well under 200 lines of code, including comments.

## A Quick Introduction

Let's write a todo app! First, we're going to define some state we want to store as a simple Typescript interface:

```ts
interface Task {
  task: string;
  completed: boolean;
  assignee: string | null;
}

interface TodosState {
  todos: Task[];
}
```

Now we're going to create a "controller" which contains a copy of this state, and some actions we can perform on the state:

```ts
import { ImmutableModelStore } from 'solox';

class TodoController {
  // Create our "model".
  public state = new ImmutableModelStore<TodosState>({ todos: [] });

  // Generate derived state from the model.
  get completedTodosCount() {
    return this.state.current.todos.filter((todo) => todo.completed === true).length;
  }

  // An action to add a new todo.
  addTodo = (task: string) => {
    this.state.update((state) => {
      state.todos.push({
        task,
        completed: false,
        assignee: null,
      });
    });
  };
}

const todoController = new TodoController();
```

Our controller has some state stored in `this.state`, which we can read from `this.state.current` (very similar to a React ref). We also defined an `addTodo()` action. The `addTodo()` action calls into `this.state.update()` to update the state. Inside the `update()` function, you can treat your state as mutable state (thanks to the magic of the [immer library](https://immerjs.github.io/immer/)). Trying to mutate `this.state.current` directly will result in an error.

Now we can add TODOs to our controller:

```ts
todoController.addTodo('Buy milk');
todoController.addTodo('Mow lawn');
console.log(`There are ${todoController.completedTodosCount} completed TODOs.`);
```

We can also subscribe to the `todoController` to find out when its state changes:

```ts
todoController.state.subscribe((state) => {
  console.log(`There are ${state.todos.length} TODOs, total.`);
});
```

When we want to use this in a React component, we can either use the global controller we created above, or we can create a local controller with `useLocalController()`. Either way, though, the `todoController` instance never changes - only `todoController.state.current` changes when the state is updated. This is very similar to `ref` in React - changing the contents of the ref won't cause the component to re-render. This means that if we want this React component to update when the state changes, we need to subscribe to the state with `useControllerState()`.

```tsx
import { useLocalController } from 'solox';

export const MyComponent = React.FC<unknown>() => {
  const todoController = useLocalController(() => new TodoController());
  const state = useControllerState(controller.state);

  return (
    <div>
      <ul>
        {state.todos.map((todo, index) => (
          <li id={index}>{todo.task}</li>
        ))}
      </ul>
    </div>
  );
}
```

Once we subscribe to the state, we can either pass that state down to children (which will cause them to re-render when that state changes) or we can pass the whole controller down (or via a context) and then `useControllerState()` can be used to select specific values from the state, and only re-render if they change, or to select derived values from the controller:

```tsx
import isShallowEqual from '@wordpress/is-shallow-equal';

export const MyComponent = React.FC<unknown>() => {
  const todoController = useLocalController(() => new TodoController());

  // Only re-render this component if state.todos or completedTodosCount changes.
  const { todos, completedTodosCount } = useControllerState(controller.state, (state) => {
    return {
      todos: state.todos,
      completedTodosCount: todoController.completedTodosCount
    }
  }, isShallowEqual);

  return (
    <div>
      <ul>
        {state.todos.map((todo, index) => (
          <li id={index}>{todo.task}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Async actions

Your actions are just functions; they can be async, they can take any number of parameters, and they can return any value. The only restriction here is that the function you pass to `update()` has to be synchronous. The trick is to make multiple calls into `update()` as your async action progresses:

```ts
class TodoController {
  // An action to load todos from the server.
  loadTodos = async () => {
    this.state.update((state) => {
      state.loading = true;
    });

    const todoResponse = await fetch('/todos');
    const todos = await todoResponse.json();

    this.state.update((state) => {
      state.loading = false;
      state.todos = todos;
    });
  };
}
```

## API

### new ImmutableModelStore(initialState)

Create a new ImmutableModelStore.

### ImmutableModelStore.current

Return the current state.

### ImmutableModelStore.update(fn)

Calls `fn(state)`. `fn` must be a synchronous function, which should make any updates to the state required, as if the state were regular mutable state. When the function returns, `ImmutableModelStore.current` will be updated with the new state.

Note that you can nest calls to `update()` - the state will not be changed until the outermost call to `update()` returns.

### ImmutableModelStore.subscribe(listener)

`subscribe(listener)` will call `listener(state)` whenever the state updates. `subscribe()` returns an `unsubscribe` function that can be called to unsubscribe.

### useControllerState(store, \[selector, \[isEqual\]\])

`useControllerState(store)` is a React hook which will subscribe to a store and return the state of the store whenever it changes. You can select an individual value by passing a selector:

```ts
const todos = useControllerState(todoController, (state) => state.todos);
```

If you return multiple values, you can also pass an optional `isEqual` function, in which cased the component will only be re-rendered if subsequent calls to the selector return different values when compared with `isEqual`. If `isEqual` is not provided, selected data will be compared with `===`.

```ts
const { name, age } = useControllerState(
  useController,
  (state) => ({ name: state.name, age: state.age }),
  isShallowEqual
);
```

### useLocalController(initializer)

Convenience hook for creating a new local controller. Calling this is equivalent to calling:

```ts
const [controller] = useState(initializer);
```

Copyright 2021 Jason Walton
