import { BaseOperation } from './base';
import { OperationEvent } from './interface';

/**
 * Example operation that demonstrates how to extend BaseOperation
 * This operation simulates a file processing task with progress updates
 */
export class ExampleOperation extends BaseOperation {
    private _filePath: string;
    private _delay: number;

    constructor(filePath: string, delay: number = 1000) {
        super();
        this._filePath = filePath;
        this._delay = delay;
    }

    /**
     * Public run method that delegates to the protected _execute method
     */
    async run(): Promise<void> {
        await this._execute();
    }

    /**
     * Implementation of the actual operation logic
     */
    protected async _executeOperation(): Promise<void> {
        // Simulate file processing with progress updates
        const steps = 10;

        for (let i = 0; i <= steps; i++) {
            // Check if operation should continue
            if (!this._shouldContinue()) {
                return;
            }

            // Update progress
            const progress = (i / steps) * 100;
            this._setProgress(progress);

            // Simulate work
            await new Promise(resolve => globalThis.setTimeout(resolve, this._delay));

            // Simulate potential error (for demonstration)
            if (i === 5 && this._filePath.includes('error')) {
                throw new Error('Simulated error during processing');
            }
        }

        // Simulate final processing
        await new Promise(resolve => globalThis.setTimeout(resolve, 500));
    }

    /**
     * Get the file path being processed
     */
    get filePath(): string {
        return this._filePath;
    }

    /**
     * Get the delay between progress updates
     */
    get delay(): number {
        return this._delay;
    }
}

/**
 * Example usage of the BaseOperation class
 */
export function createExampleOperation(filePath: string): ExampleOperation {
    const operation = new ExampleOperation(filePath);

    // Add event listeners
    operation.addListener(OperationEvent.STATUS_CHANGE, (_event, op) => {
        console.log(`Status changed: ${op.status}`);
    });

    operation.addListener(OperationEvent.PROGRESS_CHANGE, (_event, op) => {
        console.log(`Progress: ${op.progress}%`);
    });

    operation.addListener(OperationEvent.COMPLETE, () => {
        console.log('Operation completed successfully!');
    });

    operation.addListener(OperationEvent.ERROR, (_event, op) => {
        console.error('Operation failed:', op.error?.message);
    });

    operation.addListener(OperationEvent.CANCEL, () => {
        console.log('Operation was cancelled');
    });

    return operation;
}
