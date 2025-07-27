import { doesCommandExist, isCommandExecutable } from './command';

// Mock zx
jest.mock('zx', () => ({
    $: jest.fn(),
}));

describe('Command Utilities', () => {
    let mockZx: jest.Mocked<typeof import('zx')>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockZx = require('zx');
    });

    describe('doesCommandExist', () => {
        test('should return true when command exists', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.resolve(0),
            } as any);

            const result = await doesCommandExist('ls');
            
            expect(result).toBe(true);
            expect(mockZx.$).toHaveBeenCalled();
        });

        test('should return false when command does not exist', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.resolve(1),
            } as any);

            const result = await doesCommandExist('nonExistentCommand');
            
            expect(result).toBe(false);
            expect(mockZx.$).toHaveBeenCalled();
        });

        test('should return false when which command throws an error', async () => {
            mockZx.$.mockImplementation(() => {
                throw new Error('Command failed');
            });

            const result = await doesCommandExist('someCommand');
            
            expect(result).toBe(false);
            expect(mockZx.$).toHaveBeenCalled();
        });

        test('should return false when which command times out', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.reject(new Error('Timeout')),
            } as any);

            const result = await doesCommandExist('slowCommand');
            
            expect(result).toBe(false);
            expect(mockZx.$).toHaveBeenCalled();
        });

        test('should handle empty command string', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.resolve(0),
            } as any);

            const result = await doesCommandExist('');
            
            expect(result).toBe(true);
            expect(mockZx.$).toHaveBeenCalled();
        });

        test('should handle command with spaces', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.resolve(0),
            } as any);

            const result = await doesCommandExist('git status');
            
            expect(result).toBe(true);
            expect(mockZx.$).toHaveBeenCalled();
        });

        test('should handle special characters in command name', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.resolve(0),
            } as any);

            const result = await doesCommandExist('node-v16');
            
            expect(result).toBe(true);
            expect(mockZx.$).toHaveBeenCalled();
        });

        test('should handle exit code 2 (command not found)', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.resolve(2),
            } as any);

            const result = await doesCommandExist('missingCommand');
            
            expect(result).toBe(false);
            expect(mockZx.$).toHaveBeenCalled();
        });

        test('should handle exit code 127 (command not found)', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.resolve(127),
            } as any);

            const result = await doesCommandExist('missingCommand');
            
            expect(result).toBe(false);
            expect(mockZx.$).toHaveBeenCalled();
        });
    });

    describe('isCommandExecutable', () => {
        test('should return true when command is executable', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.resolve(0),
            } as any);

            const result = await isCommandExecutable('/usr/bin/ls');
            
            expect(result).toBe(true);
            expect(mockZx.$).toHaveBeenCalled();
        });

        test('should return false when command is not executable', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.resolve(1),
            } as any);

            const result = await isCommandExecutable('/usr/bin/readonlyFile');
            
            expect(result).toBe(false);
            expect(mockZx.$).toHaveBeenCalled();
        });

        test('should return false when test command throws an error', async () => {
            mockZx.$.mockImplementation(() => {
                throw new Error('Permission denied');
            });

            const result = await isCommandExecutable('/usr/bin/protected');
            
            expect(result).toBe(false);
            expect(mockZx.$).toHaveBeenCalled();
        });

        test('should return false when test command times out', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.reject(new Error('Timeout')),
            } as any);

            const result = await isCommandExecutable('/usr/bin/slowCommand');
            
            expect(result).toBe(false);
            expect(mockZx.$).toHaveBeenCalled();
        });

        test('should handle empty command path', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.resolve(0),
            } as any);

            const result = await isCommandExecutable('');
            
            expect(result).toBe(true);
            expect(mockZx.$).toHaveBeenCalled();
        });

        test('should handle command path with spaces', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.resolve(0),
            } as any);

            const result = await isCommandExecutable('/usr/local/bin/my script');
            
            expect(result).toBe(true);
            expect(mockZx.$).toHaveBeenCalled();
        });

        test('should handle command path with special characters', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.resolve(0),
            } as any);

            const result = await isCommandExecutable('/usr/bin/node-v16.14.0');
            
            expect(result).toBe(true);
            expect(mockZx.$).toHaveBeenCalled();
        });

        test('should handle relative paths', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.resolve(0),
            } as any);

            const result = await isCommandExecutable('./my-script.sh');
            
            expect(result).toBe(true);
            expect(mockZx.$).toHaveBeenCalled();
        });

        test('should handle home directory paths', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.resolve(0),
            } as any);

            const result = await isCommandExecutable('~/bin/custom-command');
            
            expect(result).toBe(true);
            expect(mockZx.$).toHaveBeenCalled();
        });
    });

    describe('Integration scenarios', () => {
        test('should handle both functions with same command', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.resolve(0),
            } as any);

            const exists = await doesCommandExist('git');
            const executable = await isCommandExecutable('/usr/bin/git');
            
            expect(exists).toBe(true);
            expect(executable).toBe(true);
            expect(mockZx.$).toHaveBeenCalledTimes(2);
        });

        test('should handle command that exists but is not executable', async () => {
            mockZx.$.mockReturnValueOnce({
                exitCode: Promise.resolve(0),
            } as any).mockReturnValueOnce({
                exitCode: Promise.resolve(1),
            } as any);

            const exists = await doesCommandExist('readonlyFile');
            const executable = await isCommandExecutable('/usr/bin/readonlyFile');
            
            expect(exists).toBe(true);
            expect(executable).toBe(false);
        });

        test('should handle command that does not exist', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.resolve(1),
            } as any);

            const exists = await doesCommandExist('nonExistent');
            const executable = await isCommandExecutable('/usr/bin/nonExistent');
            
            expect(exists).toBe(false);
            expect(executable).toBe(false);
        });

        test('should handle network timeout scenarios', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.reject(new Error('Network timeout')),
            } as any);

            /* Cspell:disable-next-line */
            const exists = await doesCommandExist('networkcommand');
            /* Cspell:disable-next-line */
            const executable = await isCommandExecutable('/usr/bin/networkcommand');
            
            expect(exists).toBe(false);
            expect(executable).toBe(false);
        });
    });

    describe('Error handling edge cases', () => {
        test('should handle undefined exitCode', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.resolve(),
            } as any);

            /* Cspell:disable-next-line */
            const result = await doesCommandExist('weirdcommand');
            
            expect(result).toBe(false);
        });

        test('should handle null exitCode', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.resolve(),
            } as any);

            /* Cspell:disable-next-line */
            const result = await doesCommandExist('weirdcommand');
            
            expect(result).toBe(false);
        });

        test('should handle non-numeric exitCode', async () => {
            mockZx.$.mockReturnValue({
                exitCode: Promise.resolve('error'),
            } as any);

            /* Cspell:disable-next-line */
            const result = await doesCommandExist('weirdcommand');
            
            expect(result).toBe(false);
        });

        test('should handle missing exitCode property', async () => {
            mockZx.$.mockReturnValue({} as any);

            /* Cspell:disable-next-line */
            const result = await doesCommandExist('weirdcommand');
            
            expect(result).toBe(false);
        });
    });
}); 