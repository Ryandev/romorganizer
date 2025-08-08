import { Runner } from './help';
import { helpText } from './help.cli';

/* Mock dependencies */
jest.mock('./help.cli', () => ({
    helpText: jest.fn(),
}));

describe('help.ts', () => {
    const mockHelpText = helpText as jest.MockedFunction<typeof helpText>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Runner class', () => {
        it('should create a Runner instance with schema', () => {
            /* Arrange */
            const schema = {
                command: 'help' as const,
                subcommand: 'compress' as const,
            };

            /* Act */
            const runner = new Runner(schema);

            /* Assert */
            expect(runner).toBeInstanceOf(Runner);
        });

        it('should return help text from start method', async () => {
            /* Arrange */
            const schema = {
                command: 'help' as const,
                subcommand: undefined,
            };
            const expectedHelpText = 'Global help text';
            mockHelpText.mockResolvedValue(expectedHelpText);
            const runner = new Runner(schema);

            /* Act */
            const result = await runner.start();

            /* Assert */
            expect(result).toBe(expectedHelpText);
            expect(mockHelpText).toHaveBeenCalledWith(schema);
        });

        it('should handle different schema configurations', async () => {
            /* Arrange */
            const testCases = [
                {
                    schema: {
                        command: 'help' as const,
                        subcommand: 'compress' as const,
                    },
                    expectedText: 'Compress help text',
                },
                {
                    schema: {
                        command: 'help' as const,
                        subcommand: 'verify' as const,
                    },
                    expectedText: 'Verify help text',
                },
                {
                    schema: { command: 'help' as const, subcommand: undefined },
                    expectedText: 'Global help text',
                },
            ];

            for (const testCase of testCases) {
                mockHelpText.mockResolvedValue(testCase.expectedText);
                const runner = new Runner(testCase.schema);

                /* Act */
                const result = await runner.start();

                /* Assert */
                expect(result).toBe(testCase.expectedText);
                expect(mockHelpText).toHaveBeenCalledWith(testCase.schema);
            }
        });
    });
});
