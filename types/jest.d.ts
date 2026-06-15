type JestMockFunction = {
  (...args: any[]): any;
  mockClear(): void;
  mockReset(): void;
  mockImplementation(fn: (...args: any[]) => any): JestMockFunction;
  mockResolvedValue(value: any): JestMockFunction;
  mockResolvedValueOnce(value: any): JestMockFunction;
  mockRejectedValue(value: any): JestMockFunction;
  mockRejectedValueOnce(value: any): JestMockFunction;
  mockReturnValue(value: any): JestMockFunction;
  mockReturnValueOnce(value: any): JestMockFunction;
};

declare namespace jest {
  export type Mock = JestMockFunction;
  export type MockedFunction<T extends (...args: any[]) => any> = T & JestMockFunction;
}

declare const jest: {
  fn: (implementation?: (...args: any[]) => any) => JestMockFunction;
  mock: (moduleName: string, factory?: () => any) => void;
  clearAllMocks: () => void;
  resetAllMocks: () => void;
};

declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;
declare const test: (name: string, fn: () => void | Promise<void>) => void;
declare const expect: any;
declare const beforeAll: (fn: () => void | Promise<void>) => void;
declare const afterAll: (fn: () => void | Promise<void>) => void;
declare const beforeEach: (fn: () => void | Promise<void>) => void;
declare const afterEach: (fn: () => void | Promise<void>) => void;
