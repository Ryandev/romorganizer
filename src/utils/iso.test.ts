import { jest } from '@jest/globals';
import iso from './iso';
import storage from './storage';
import { doesCommandExist, isCommandExecutable } from './command';
import { guard } from './guard';
import { withTimeout } from './promise';

// Mock dependencies
jest.mock('./storage');
jest.mock('./command');
jest.mock('./guard');
jest.mock('./logger');
jest.mock('./promise');
jest.mock('zx', () => ({
    $: jest.fn(),
}));

const mockStorage = storage as jest.MockedFunction<typeof storage>;
const mockDoesCommandExist = doesCommandExist as jest.MockedFunction<typeof doesCommandExist>;
const mockIsCommandExecutable = isCommandExecutable as jest.MockedFunction<typeof isCommandExecutable>;
const mockGuard = guard as jest.MockedFunction<typeof guard>;
const mockWithTimeout = withTimeout as jest.MockedFunction<typeof withTimeout>;

describe('ISO Utilities', () => {
    let mockStorageInstance: any;
    let mockZx: any;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup storage mock
        mockStorageInstance = {
            createTemporaryDirectory: jest.fn().mockResolvedValue('/tmp/test-dir'),
            exists: jest.fn().mockResolvedValue(true),
            size: jest.fn().mockResolvedValue(1024),
        };
        mockStorage.mockReturnValue(mockStorageInstance);
        
        // Setup zx mock
        mockZx = {
            $: jest.fn().mockReturnValue({
                exitCode: 0,
                stdout: 'test output',
            }),
        };
        require('zx').$ = mockZx.$;
        
        // Setup withTimeout mock to return the promise directly
        mockWithTimeout.mockImplementation(async (promise) => {
            return await promise;
        });
        
        // Setup command mocks
        mockDoesCommandExist.mockResolvedValue(true);
        mockIsCommandExecutable.mockResolvedValue(true);
        
        // Setup guard mock
        mockGuard.mockImplementation((condition: boolean, message: string) => {
            if (!condition) {
                throw new Error(message);
            }
        });
    });

    describe('convert', () => {
        it('should convert ISO to BIN format successfully', async () => {
            const result = await iso.convert('/path/to/test.iso');
            
            expect(result).toContain('.bin');
            expect(mockStorageInstance.createTemporaryDirectory).toHaveBeenCalled();
            expect(mockZx.$).toHaveBeenCalledWith(['', ' convert "', '" -o "', '"'], '/Users/ats/.bin/poweriso', '/path/to/test.iso', expect.stringContaining('.bin'));
        });

        it('should throw error when poweriso is not installed', async () => {
            mockDoesCommandExist.mockResolvedValue(false);
            
            await expect(iso.convert('/path/to/test.iso')).rejects.toThrow('PowerISO operations failed');
        });

        it('should throw error when conversion fails', async () => {
            mockZx.$.mockReturnValue({
                exitCode: 1,
            });
            
            await expect(iso.convert('/path/to/test.iso')).rejects.toThrow('Failed to convert /path/to/test.iso to BIN/CUE');
        });


    });
}); 