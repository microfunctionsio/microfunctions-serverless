export const isString = value => {
  return value instanceof String || typeof value === 'string';
};
export const isObject = value => {
  return (
    value != null &&
    (typeof value === 'object' || typeof value === 'function') &&
    !Array.isArray(value)
  );
};
export class ServerlessException extends Error {
  constructor(
    public readonly message: any,
    private readonly status: string = '',
    private readonly cwd: string = '',
  ) {
    super();
  }

  public getStatus(): string {
    return this.status;
  }

  public getCwd(): string {
    return this.cwd;
  }

  public toString(): string {
    const message = this.getErrorString(this.message);
    return `Error: ${message}`;
  }

  private getErrorString(target: string | object): string | object {
    return isString(target) ? target : JSON.stringify(target);
  }

  public static createBody = (
    message: object | string,
    error?: string,
    code?: number,
  ) => {
    if (!message) {
      return { code, error };
    }
    return isObject(message) && !Array.isArray(message)
      ? message
      : { code, error, message };
  };
}
