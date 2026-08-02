/** 描述当前模块对外公开的业务数据契约。 */
export interface LogWriter {
  /**
   * 方法名：write
   * 作用：按指定等级和格式记录日志。
   * @param line 方法所需的 line 参数。
   * @returns 本次处理得到的结果。
   */
  write(line: string): Promise<void>;
  /**
   * 方法名：close
   * 作用：完成待处理工作并安全释放运行资源。
   * @returns 本次处理得到的结果。
   */
  close(): Promise<void>;
}

/** 封装该模块的状态与操作入口。 */
export class NoopLogWriter implements LogWriter {
  /**
   * 方法名：write
   * 作用：按指定等级和格式记录日志。
   * @param _line 方法所需的 _line 参数。
   * @returns 本次处理得到的结果。
   */
  async write(_line: string): Promise<void> {}

  /**
   * 方法名：close
   * 作用：完成待处理工作并安全释放运行资源。
   * @returns 本次处理得到的结果。
   */
  async close(): Promise<void> {}
}
