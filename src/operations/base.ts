import {
    IOperation,
    OperationStatus,
    OperationEvent,
    OperationListener,
} from './interface';
import { createCallbackManager } from './callback';

/**
 * Base class for implementing operations
 * Provides common functionality for status management, progress tracking, and event handling
 */
export abstract class BaseOperation implements IOperation {
    protected _status: OperationStatus = OperationStatus.PENDING;
    protected _progress: number = 0;
    protected _error?: Error;
    protected _isCancelled: boolean = false;
    protected _eventManager = createCallbackManager();

    /**
     * Current status of the operation
     */
    get status(): OperationStatus {
        return this._status;
    }

    /**
     * Current progress of the operation (0-100)
     */
    get progress(): number {
        return this._progress;
    }

    /**
     * Error that occurred during operation execution
     */
    get error(): Error | undefined {
        return this._error;
    }

    /**
     * Whether the operation has been cancelled
     */
    get isCancelled(): boolean {
        return this._isCancelled;
    }

    /**
     * Execute the operation
     * This method should be implemented by subclasses
     */
    abstract run(): Promise<void>;

    /**
     * Cancel the operation
     */
    cancel(): void {
        if (this._status === OperationStatus.RUNNING) {
            this._isCancelled = true;
            this._status = OperationStatus.FAILED;
            this._error = new Error('Operation cancelled');
            this._emitEvent(OperationEvent.CANCEL);
        }
    }

    /**
     * Add an event listener
     * @param event - The event type to listen for
     * @param callback - The callback function to execute when the event occurs
     */
    addListener(event: OperationEvent, callback: OperationListener): void {
        this._eventManager.addListener(event, callback);
    }

    /**
     * Remove an event listener
     * @param event - The event type to stop listening for
     * @param callback - The callback function to remove
     */
    removeListener(event: OperationEvent, callback: OperationListener): void {
        this._eventManager.removeListener(event, callback);
    }

    /**
     * Protected method to update operation status
     * @param status - New status
     */
    protected _setStatus(status: OperationStatus): void {
        if (this._status !== status) {
            this._status = status;
            this._emitEvent(OperationEvent.STATUS_CHANGE);
        }
    }

    /**
     * Protected method to update operation progress
     * @param progress - New progress value (0-100)
     */
    protected _setProgress(progress: number): void {
        const clampedProgress = Math.max(0, Math.min(100, progress));
        if (this._progress !== clampedProgress) {
            this._progress = clampedProgress;
            this._emitEvent(OperationEvent.PROGRESS_CHANGE);
        }
    }

    /**
     * Protected method to set operation error
     * @param error - Error that occurred
     */
    protected _setError(error: Error): void {
        this._error = error;
        this._status = OperationStatus.FAILED;
        this._emitEvent(OperationEvent.ERROR);
    }

    /**
     * Protected method to mark operation as completed
     */
    protected _setCompleted(): void {
        this._status = OperationStatus.COMPLETED;
        this._progress = 100;
        this._emitEvent(OperationEvent.COMPLETE);
    }

    /**
     * Protected method to emit events to listeners
     * @param event - Event type to emit
     */
    protected _emitEvent(event: OperationEvent): void {
        const listeners = this._eventManager.allListeners(event);
        for (const listener of listeners) {
            try {
                listener(event, this);
            } catch (error) {
                console.error(`Error in operation event listener: ${error}`);
            }
        }
    }

    /**
     * Protected method to check if operation should continue
     * @returns True if operation should continue, false if cancelled
     */
    protected _shouldContinue(): boolean {
        return !this._isCancelled && this._status === OperationStatus.RUNNING;
    }

    /**
     * Protected method to execute the operation with proper status management
     * This method should be called by subclasses in their run() implementation
     */
    protected async _execute(): Promise<void> {
        try {
            this._setStatus(OperationStatus.RUNNING);
            this._setProgress(0);
            this._isCancelled = false;
            delete this._error;

            await this._executeOperation();

            if (this._shouldContinue()) {
                this._setCompleted();
            }
        } catch (error) {
            if (this._shouldContinue()) {
                this._setError(
                    error instanceof Error ? error : new Error(String(error))
                );
            }
        }
    }

    /**
     * Abstract method that subclasses must implement
     * This contains the actual operation logic
     */
    protected abstract _executeOperation(): Promise<void>;

    /**
     * Get a string representation of the operation
     */
    toString(): string {
        return `${this.constructor.name} [${this._status}] - Progress: ${this._progress}%`;
    }
}
