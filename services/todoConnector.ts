/**
 * Future external to-do sync (Todoist / Asana / etc.).
 * No live OAuth in this pass — interface reserved for connectors.
 */
export interface ExternalTodoItem {
  id: string;
  label: string;
  dueDateKey?: string;
  patientId?: string;
  done?: boolean;
}

export interface TodoConnector {
  readonly provider: 'todoist' | 'asana' | 'other';
  listOpenTodos(): Promise<ExternalTodoItem[]>;
  markDone(id: string, done: boolean): Promise<void>;
}

/** Placeholder until OAuth connectors ship. */
export const stubTodoConnector: TodoConnector = {
  provider: 'other',
  async listOpenTodos() {
    return [];
  },
  async markDone() {
    // no-op
  },
};
