/**
 * @jest-environment jsdom
 */

import React from 'react';
import * as ReactDOMClient from 'react-dom/client';
import { ImmutableModelStore, useControllerState, useLocalController } from '../src';
import { act } from 'react-dom/test-utils';
import { expect } from 'chai';

interface Task {
    task: string;
    completed: boolean;
    assignee: string | null;
}

interface TodosState {
    todos: Task[];
}

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

export const TestComponent: React.FC<unknown> = () => {
    const todoController = useLocalController(() => new TodoController());
    const todos = useControllerState(todoController.state, (state) => state.todos);

    return (
        <div>
            <ul>
                {todos.map((todo, index) => (
                    <li key={`todo-${index}`}>{todo.task}</li>
                ))}
            </ul>
            <button
                data-testid="add-todo"
                onClick={() => {
                    todoController.addTodo('Buy milk');
                }}
            >
                Add Todo
            </button>
        </div>
    );
};

describe('react test', () => {
    let container: HTMLDivElement;
    let root: ReactDOMClient.Root;

    beforeAll(() => {
        (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    });

    beforeEach(() => {
        // setup a DOM element as a render target
        container = document.createElement('div');
        document.body.appendChild(container);
        root = ReactDOMClient.createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    it('should render the component', async () => {
        act(() => {
            root.render(<TestComponent />);
        });

        const button = document.querySelector('[data-testid=add-todo]') as Element;
        act(() => {
            button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        expect(container.textContent).to.include('Buy milk');
    });
});
