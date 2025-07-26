export enum OperationStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

export enum OperationEvent {
    STATUS_CHANGE = 'statusChange',
    PROGRESS_CHANGE = 'progressChange',
    ERROR = 'error',
    COMPLETE = 'complete',
    CANCEL = 'cancel',
}

export type OperationListener = (
    event: OperationEvent,
    operation: IOperation
) => void;

export interface IOperation {
    status: OperationStatus;
    progress: number;
    error?: Error | undefined;
    run: () => Promise<void>;
    cancel: () => void;
    addListener: (event: OperationEvent, callback: OperationListener) => void;
    removeListener: (
        event: OperationEvent,
        callback: OperationListener
    ) => void;
}
