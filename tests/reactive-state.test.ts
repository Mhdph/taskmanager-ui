import { describe, expect, it } from 'vitest';
import { createReactiveState } from '../src/lib/reactive-state';

const settle = () => new Promise<void>(resolve => queueMicrotask(resolve));

describe('workspace Store adapter', () => {
  it('batches nested changes and array mutations, ignoring unchanged assignments', async () => {
    const { state, store } = createReactiveState({ ui: { collapsed: false }, tasks: [] as { title: string }[] });
    state.ui.collapsed = true;
    state.tasks.push({ title: 'First' });
    state.tasks[0].title = 'Updated';
    await settle();
    expect(store.state.revision).toBe(1);
    expect(store.state.value.tasks[0].title).toBe('Updated');
    state.ui.collapsed = true;
    await settle();
    expect(store.state.revision).toBe(1);
  });

  it('keeps Set selection methods reactive and serializes persisted data', async () => {
    const { state, store } = createReactiveState({ selected: new Set<string>(), tasks: [{ id: 't1' }] });
    state.selected.add('t1').add('t2');
    expect([...state.selected]).toEqual(['t1', 't2']);
    await settle();
    expect(store.state.revision).toBe(1);
    state.selected.delete('t1');
    state.selected.clear();
    await settle();
    expect(store.state.revision).toBe(2);
    expect(JSON.parse(JSON.stringify(state.tasks))).toEqual([{ id: 't1' }]);
  });

  it('preserves native objects such as upload files and dates', () => {
    const file = new File(['example'], 'attachment.txt');
    const date = new Date('2026-10-18');
    const { state } = createReactiveState({ uploads: [{ file }], date });
    expect(state.uploads[0].file).toBe(file);
    expect(state.uploads[0].file.name).toBe('attachment.txt');
    expect(state.date.getTime()).toBe(date.getTime());
  });

  it('does not wrap assigned proxies again or notify on repeated proxy assignment', async () => {
    const { state, store } = createReactiveState({ task: { id: 't1' } });
    const task = state.task;
    state.task = task;
    await settle();
    expect(state.task).toBe(task);
    expect(store.state.revision).toBe(0);
  });
});
