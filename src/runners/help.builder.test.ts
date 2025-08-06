import helpBuilder from './help.builder';

/* Mock dependencies */
jest.mock('./help.cli', () => ({
    parseHelpArguments: jest.fn(),
    helpText: jest.fn(),
}));

jest.mock('./help', () => ({
    Runner: jest.fn(),
}));

describe('help.builder', () => {
    const mockParseHelpArguments = require('./help.cli').parseHelpArguments;
    const mockHelpText = require('./help.cli').helpText;
    const MockRunner = require('./help').Runner;

    beforeEach(() => {
        jest.clearAllMocks();
        MockRunner.mockImplementation(() => ({
            start: jest.fn().mockResolvedValue('Help text displayed'),
            getHelpText: jest.fn().mockReturnValue('Mock help text'),
        }));
    });

    describe('builder function', () => {
        it('should return a RunnerBuilder instance', () => {
            /* Arrange */
            const mockParsedArgs = {
                command: 'help' as const,
                subcommand: undefined,
            };
            mockParseHelpArguments.mockReturnValue(mockParsedArgs);
            mockHelpText.mockReturnValue('Global help text');

            /* Act */
            const result = helpBuilder([]);

            /* Assert */
            expect(result).toBeDefined();
            expect(typeof result.create).toBe('function');
            expect(typeof result.getHelpText).toBe('function');
            expect(mockParseHelpArguments).toHaveBeenCalledWith([]);
        });

        it('should create a Runner with correct parameters', async () => {
            /* Arrange */
            const mockParsedArgs = {
                command: 'help' as const,
                subcommand: 'compress',
            };
            mockParseHelpArguments.mockReturnValue(mockParsedArgs);
            mockHelpText.mockReturnValue('Compress help text');

            /* Act */
            const builder = helpBuilder(['compress']);
            const runner = await builder.create();

            /* Assert */
            expect(MockRunner).toHaveBeenCalledWith(mockParsedArgs);
            expect(runner).toBeDefined();
            expect(typeof runner.start).toBe('function');
        });

        it('should return the correct help text', () => {
            /* Arrange */
            const mockParsedArgs = {
                command: 'help' as const,
                subcommand: 'verify',
            };
            mockParseHelpArguments.mockReturnValue(mockParsedArgs);
            mockHelpText.mockReturnValue('Verify help text');

            /* Act */
            const builder = helpBuilder(['verify']);
            const helpText = builder.getHelpText();

            /* Assert */
            expect(helpText).toBe('Verify help text');
            expect(mockHelpText).toHaveBeenCalledWith(mockParsedArgs);
        });

        it('should handle empty parameters array', () => {
            /* Arrange */
            const mockParsedArgs = {
                command: 'help' as const,
                subcommand: undefined,
            };
            mockParseHelpArguments.mockReturnValue(mockParsedArgs);
            mockHelpText.mockReturnValue('Global help text');

            /* Act */
            const result = helpBuilder([]);

            /* Assert */
            expect(result).toBeDefined();
            expect(mockParseHelpArguments).toHaveBeenCalledWith([]);
        });

        it('should handle parameters with subcommand', () => {
            /* Arrange */
            const mockParsedArgs = {
                command: 'help' as const,
                subcommand: 'compress',
            };
            mockParseHelpArguments.mockReturnValue(mockParsedArgs);
            mockHelpText.mockReturnValue('Compress help text');

            /* Act */
            const builder = helpBuilder(['compress']);

            /* Assert */
            expect(builder).toBeDefined();
            expect(mockParseHelpArguments).toHaveBeenCalledWith(['compress']);
        });

        it('should handle parameters with multiple arguments', () => {
            /* Arrange */
            const mockParsedArgs = {
                command: 'help' as const,
                subcommand: 'verify',
            };
            mockParseHelpArguments.mockReturnValue(mockParsedArgs);
            mockHelpText.mockReturnValue('Verify help text');

            /* Act */
            const builder = helpBuilder(['verify', '--extra', 'args']);

            /* Assert */
            expect(builder).toBeDefined();
            expect(mockParseHelpArguments).toHaveBeenCalledWith([
                'verify',
                '--extra',
                'args',
            ]);
        });

        it('should propagate parsing errors', () => {
            /* Arrange */
            const parseError = new Error('Invalid arguments');
            mockParseHelpArguments.mockImplementation(() => {
                throw parseError;
            });

            /* Act & Assert */
            expect(() => {
                helpBuilder(['--invalid-flag']);
            }).toThrow('Invalid arguments');
        });

        it('should handle help text generation errors', () => {
            /* Arrange */
            const mockParsedArgs = {
                command: 'help' as const,
                subcommand: 'unknown',
            };
            mockParseHelpArguments.mockReturnValue(mockParsedArgs);
            mockHelpText.mockImplementation(() => {
                throw new Error('Help text generation failed');
            });

            /* Act & Assert */
            const builder = helpBuilder(['unknown']);
            expect(() => {
                builder.getHelpText();
            }).toThrow('Help text generation failed');
        });

        it('should handle different subcommands correctly', () => {
            /* Arrange */
            const subcommands = ['compress', 'verify', 'help', undefined];

            for (const subcommand of subcommands) {
                const mockParsedArgs = {
                    command: 'help' as const,
                    subcommand,
                };
                mockParseHelpArguments.mockReturnValue(mockParsedArgs);
                mockHelpText.mockReturnValue(
                    `${subcommand || 'global'} help text`
                );

                /* Act */
                const builder = helpBuilder(subcommand ? [subcommand] : []);
                const helpText = builder.getHelpText();

                /* Assert */
                expect(helpText).toBe(`${subcommand || 'global'} help text`);
                expect(mockHelpText).toHaveBeenCalledWith(mockParsedArgs);
            }
        });
    });

    describe('RunnerBuilder interface compliance', () => {
        it('should implement RunnerBuilder interface correctly', () => {
            /* Arrange */
            const mockParsedArgs = {
                command: 'help' as const,
                subcommand: undefined,
            };
            mockParseHelpArguments.mockReturnValue(mockParsedArgs);
            mockHelpText.mockReturnValue('Global help text');

            /* Act */
            const builder = helpBuilder([]);

            /* Assert */
            expect(builder).toHaveProperty('create');
            expect(builder).toHaveProperty('getHelpText');
            expect(typeof builder.create).toBe('function');
            expect(typeof builder.getHelpText).toBe('function');
        });

        it('should return a Promise from create method', () => {
            /* Arrange */
            const mockParsedArgs = {
                command: 'help' as const,
                subcommand: undefined,
            };
            mockParseHelpArguments.mockReturnValue(mockParsedArgs);
            mockHelpText.mockReturnValue('Global help text');

            /* Act */
            const builder = helpBuilder([]);
            const createResult = builder.create();

            /* Assert */
            expect(createResult).toBeInstanceOf(Promise);
        });
    });

    describe('edge cases', () => {
        it('should handle null subcommand', () => {
            /* Arrange */
            const mockParsedArgs = {
                command: 'help' as const,
                subcommand: null,
            };
            mockParseHelpArguments.mockReturnValue(mockParsedArgs);
            mockHelpText.mockReturnValue('Global help text');

            /* Act */
            const builder = helpBuilder([]);
            const helpText = builder.getHelpText();

            /* Assert */
            expect(helpText).toBe('Global help text');
        });

        it('should handle empty string subcommand', () => {
            /* Arrange */
            const mockParsedArgs = {
                command: 'help' as const,
                subcommand: '',
            };
            mockParseHelpArguments.mockReturnValue(mockParsedArgs);
            mockHelpText.mockReturnValue('Global help text');

            /* Act */
            const builder = helpBuilder(['']);
            const helpText = builder.getHelpText();

            /* Assert */
            expect(helpText).toBe('Global help text');
        });

        it('should handle very long subcommand', () => {
            /* Arrange */
            const longSubcommand = 'a'.repeat(1000);
            const mockParsedArgs = {
                command: 'help' as const,
                subcommand: longSubcommand,
            };
            mockParseHelpArguments.mockReturnValue(mockParsedArgs);
            mockHelpText.mockReturnValue('Long subcommand help text');

            /* Act */
            const builder = helpBuilder([longSubcommand]);
            const helpText = builder.getHelpText();

            /* Assert */
            expect(helpText).toBe('Long subcommand help text');
        });
    });
});
