/** 描述当前模块对外公开的业务数据契约。 */
export type SystemScaffoldStatus = "scaffold";

/** 描述当前模块对外公开的业务数据契约。 */
export interface SystemScaffold<Name extends string> {
  readonly name: Name;
  readonly status: SystemScaffoldStatus;
}
