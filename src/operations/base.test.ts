import { BaseOperation } from './base.js';
import {
    OperationStatus,
    OperationEvent,
} from './interface.js';

// Create a concrete implementation of BaseOperation for testing
class TestOperation extends BaseOperation {
    private _shouldFail: boolean = false;
    private _shouldCancel: boolean = false;

    constructor(shouldFail: boolean = false, shouldCancel: boolean = false) {
        super();
        this._shouldFail = shouldFail;
        this._shouldCancel = shouldCancel;
    }

    async run(): Promise<void> {
        await this._execute();
    }

    protected async _executeOperation(): Promise<void> {
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 10));

        if (this._shouldCancel) {
            this.cancel();
            return;
        }

        if (this._shouldFail) {
            throw new Error('Test operation failed');
        }

        // Simulate progress updates
        this._setProgress(50);
        await new Promise(resolve => setTimeout(resolve, 10));
        this._setProgress(100);
    }

    // Expose protected methods for testing
    public testSetStatus(status: OperationStatus): void {
        this._setStatus(status);
    }

    public testSetProgress(progress: number): void {
        this._setProgress(progress);
    }

    public testSetError(error: Error): void {
        this._setError(error);
    }

    public testSetCompleted(): void {
        this._setCompleted();
    }

    public testShouldContinue(): boolean {
        return this._shouldContinue();
    }
}

describe('BaseOperation', () => {
    let operation: TestOperation;

    beforeEach(() => {
        operation = new TestOperation();
    });

    describe('initial state', () => {
        it('should have correct initial values', () => {
            expect(operation.status).toBe(OperationStatus.PENDING);
            expect(operation.progress).toBe(0);
            expect(operation.error).toBeUndefined();
            expect(operation.isCancelled).toBe(false);
        });
    });

    describe('status management', () => {
        it('should update status correctly', () => {
            operation.testSetStatus(OperationStatus.RUNNING);
            expect(operation.status).toBe(OperationStatus.RUNNING);
        });

        it('should emit status change event', () => {
            const listener = jest.fn();
            operation.addListener(OperationEvent.STATUS_CHANGE, listener);

            operation.testSetStatus(OperationStatus.RUNNING);

            expect(listener).toHaveBeenCalledWith(
                OperationEvent.STATUS_CHANGE,
                operation
            );
        });

        it('should not emit event when status is the same', () => {
            const listener = jest.fn();
            operation.addListener(OperationEvent.STATUS_CHANGE, listener);

            operation.testSetStatus(OperationStatus.PENDING); // Same status

            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('progress management', () => {
        it('should update progress correctly', () => {
            operation.testSetProgress(50);
            expect(operation.progress).toBe(50);
        });

        it('should clamp progress to 0-100 range', () => {
            operation.testSetProgress(-10);
            expect(operation.progress).toBe(0);

            operation.testSetProgress(150);
            expect(operation.progress).toBe(100);
        });

        it('should emit progress change event', () => {
            const listener = jest.fn();
            operation.addListener(OperationEvent.PROGRESS_CHANGE, listener);

            operation.testSetProgress(50);

            expect(listener).toHaveBeenCalledWith(
                OperationEvent.PROGRESS_CHANGE,
                operation
            );
        });

        it('should not emit event when progress is the same', () => {
            const listener = jest.fn();
            operation.addListener(OperationEvent.PROGRESS_CHANGE, listener);

            operation.testSetProgress(0); // Same progress

            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('should set error correctly', () => {
            const error = new Error('Test error');
            operation.testSetError(error);

            expect(operation.error).toBe(error);
            expect(operation.status).toBe(OperationStatus.FAILED);
        });

        it('should emit error event', () => {
            const listener = jest.fn();
            operation.addListener(OperationEvent.ERROR, listener);

            const error = new Error('Test error');
            operation.testSetError(error);

            expect(listener).toHaveBeenCalledWith(
                OperationEvent.ERROR,
                operation
            );
        });
    });

    describe('completion handling', () => {
        it('should mark operation as completed', () => {
            operation.testSetCompleted();

            expect(operation.status).toBe(OperationStatus.COMPLETED);
            expect(operation.progress).toBe(100);
        });

        it('should emit complete event', () => {
            const listener = jest.fn();
            operation.addListener(OperationEvent.COMPLETE, listener);

            operation.testSetCompleted();

            expect(listener).toHaveBeenCalledWith(
                OperationEvent.COMPLETE,
                operation
            );
        });
    });

    describe('cancellation', () => {
        it('should cancel running operation', () => {
            operation.testSetStatus(OperationStatus.RUNNING);
            operation.cancel();

            expect(operation.isCancelled).toBe(true);
            expect(operation.status).toBe(OperationStatus.FAILED);
            expect(operation.error?.message).toBe('Operation cancelled');
        });

        it('should not cancel non-running operation', () => {
            operation.cancel();

            expect(operation.isCancelled).toBe(false);
            expect(operation.status).toBe(OperationStatus.PENDING);
        });

        it('should emit cancel event', () => {
            const listener = jest.fn();
            operation.addListener(OperationEvent.CANCEL, listener);

            operation.testSetStatus(OperationStatus.RUNNING);
            operation.cancel();

            expect(listener).toHaveBeenCalledWith(
                OperationEvent.CANCEL,
                operation
            );
        });
    });

    describe('event listeners', () => {
        it('should add and remove listeners', () => {
            const listener = jest.fn();

            operation.addListener(OperationEvent.STATUS_CHANGE, listener);
            operation.testSetStatus(OperationStatus.RUNNING);
            expect(listener).toHaveBeenCalledTimes(1);

            operation.removeListener(OperationEvent.STATUS_CHANGE, listener);
            operation.testSetStatus(OperationStatus.COMPLETED);
            expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
        });

        it('should handle multiple listeners', () => {
            const listener1 = jest.fn();
            const listener2 = jest.fn();

            operation.addListener(OperationEvent.STATUS_CHANGE, listener1);
            operation.addListener(OperationEvent.STATUS_CHANGE, listener2);

            operation.testSetStatus(OperationStatus.RUNNING);

            expect(listener1).toHaveBeenCalledWith(
                OperationEvent.STATUS_CHANGE,
                operation
            );
            expect(listener2).toHaveBeenCalledWith(
                OperationEvent.STATUS_CHANGE,
                operation
            );
        });

        it('should handle listener errors gracefully', () => {
            const errorListener = jest.fn().mockImplementation(() => {
                throw new Error('Listener error');
            });

            const consoleSpy = jest
                .spyOn(console, 'error')
                .mockImplementation();

            operation.addListener(OperationEvent.STATUS_CHANGE, errorListener);
            operation.testSetStatus(OperationStatus.RUNNING);

            expect(consoleSpy).toHaveBeenCalledWith(
                'Error in operation event listener: Error: Listener error'
            );
            consoleSpy.mockRestore();
        });
    });

    describe('should continue check', () => {
        it('should return true for running non-cancelled operation', () => {
            operation.testSetStatus(OperationStatus.RUNNING);
            expect(operation.testShouldContinue()).toBe(true);
        });

        it('should return false for cancelled operation', () => {
            operation.testSetStatus(OperationStatus.RUNNING);
            operation.cancel();
            expect(operation.testShouldContinue()).toBe(false);
        });

        it('should return false for non-running operation', () => {
            expect(operation.testShouldContinue()).toBe(false);
        });
    });

    describe('operation execution', () => {
        it('should execute successfully', async () => {
            const statusListener = jest.fn();
            const progressListener = jest.fn();
            const completeListener = jest.fn();

            operation.addListener(OperationEvent.STATUS_CHANGE, statusListener);
            operation.addListener(
                OperationEvent.PROGRESS_CHANGE,
                progressListener
            );
            operation.addListener(OperationEvent.COMPLETE, completeListener);

            await operation.run();

            expect(operation.status).toBe(OperationStatus.COMPLETED);
            expect(operation.progress).toBe(100);
            expect(statusListener).toHaveBeenCalled();
            expect(progressListener).toHaveBeenCalled();
            expect(completeListener).toHaveBeenCalled();
        });

        it('should handle execution errors', async () => {
            const failingOperation = new TestOperation(true);
            const errorListener = jest.fn();

            failingOperation.addListener(OperationEvent.ERROR, errorListener);

            await failingOperation.run();

            expect(failingOperation.status).toBe(OperationStatus.FAILED);
            expect(failingOperation.error?.message).toBe(
                'Test operation failed'
            );
            expect(errorListener).toHaveBeenCalled();
        });

        it('should handle cancellation during execution', async () => {
            const cancellingOperation = new TestOperation(false, true);
            const cancelListener = jest.fn();

            cancellingOperation.addListener(
                OperationEvent.CANCEL,
                cancelListener
            );

            await cancellingOperation.run();

            expect(cancellingOperation.status).toBe(OperationStatus.FAILED);
            expect(cancellingOperation.isCancelled).toBe(true);
            expect(cancelListener).toHaveBeenCalled();
        });
    });

    describe('toString', () => {
        it('should return meaningful string representation', () => {
            const result = operation.toString();
            expect(result).toContain('TestOperation');
            expect(result).toContain('pending');
            expect(result).toContain('0%');
        });
    });
});
