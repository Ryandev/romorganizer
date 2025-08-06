export interface IRunner<T> {
    start(): Promise<T>;
}

export interface RunnerBuilder<T> {
    create: () => Promise<IRunner<T>>;
    getHelpText: () => string;
}
