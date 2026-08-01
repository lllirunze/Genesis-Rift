export interface LogWriter {
  write(line: string): Promise<void>;
  close(): Promise<void>;
}

export class NoopLogWriter implements LogWriter {
  async write(_line: string): Promise<void> {}

  async close(): Promise<void> {}
}
