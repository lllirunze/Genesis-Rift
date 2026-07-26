export type SystemScaffoldStatus = "scaffold";

export interface SystemScaffold<Name extends string> {
  readonly name: Name;
  readonly status: SystemScaffoldStatus;
}
