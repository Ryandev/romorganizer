import { jest } from '@jest/globals';
import { extract, verify, create, convertToBinCue } from './iso';
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
        mockStorage.mockResolvedValue(mockStorageInstance);
        
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

    describe('extract', () => {
        it('should extract ISO file successfully', async () => {
            const result = await extract('/path/to/test.iso');
            
            expect(result).toBe('/tmp/test-dir');
            expect(mockStorageInstance.createTemporaryDirectory).toHaveBeenCalled();
            expect(mockZx.$).toHaveBeenCalledWith(['', ' extract "', '" "', '"'], 'poweriso', '/path/to/test.iso', '/tmp/test-dir');
        });

        it('should throw error when poweriso is not installed', async () => {
            mockDoesCommandExist.mockResolvedValue(false);
            
            await expect(extract('/path/to/test.iso')).rejects.toThrow('PowerISO operations failed');
        });

        it('should throw error when extraction fails', async () => {
            mockZx.$.mockReturnValue({
                exitCode: 1,
            });
            
            await expect(extract('/path/to/test.iso')).rejects.toThrow('Failed to extract /path/to/test.iso');
        });
    });

    describe('verify', () => {
        it('should verify ISO file successfully', async () => {
            const result = await verify('/path/to/test.iso');
            
            expect(result).toBe(true);
            expect(mockStorageInstance.exists).toHaveBeenCalledWith('/path/to/test.iso');
            expect(mockZx.$).toHaveBeenCalledWith(['', ' test "', '"'], 'poweriso', '/path/to/test.iso');
        });

        it('should return false when file does not exist', async () => {
            mockStorageInstance.exists.mockResolvedValue(false);
            
            const result = await verify('/path/to/test.iso');
            
            expect(result).toBe(false);
        });

        it('should return false when poweriso is not installed', async () => {
            mockDoesCommandExist.mockResolvedValue(false);
            
            const result = await verify('/path/to/test.iso');
            
            expect(result).toBe(false);
        });

        it('should return false when verification fails', async () => {
            mockZx.$.mockReturnValue({
                exitCode: 1,
            });
            
            const result = await verify('/path/to/test.iso');
            
            expect(result).toBe(false);
        });
    });

    describe('create', () => {
        it('should create ISO file successfully', async () => {
            const result = await create('/path/to/contents');
            
            expect(result).toBe('/tmp/test-dir/contents.iso');
            expect(mockStorageInstance.createTemporaryDirectory).toHaveBeenCalled();
            expect(mockZx.$).toHaveBeenCalledWith(['', ' create "', '" "', '"'], 'poweriso', '/tmp/test-dir/contents.iso', '/path/to/contents');
        });

        it('should create ISO file with custom output path', async () => {
            const result = await create('/path/to/contents', '/custom/output.iso');
            
            expect(result).toBe('/custom/output.iso');
            expect(mockZx.$).toHaveBeenCalledWith(['', ' create "', '" "', '"'], 'poweriso', '/custom/output.iso', '/path/to/contents');
        });

        it('should throw error when poweriso is not installed', async () => {
            mockDoesCommandExist.mockResolvedValue(false);
            
            await expect(create('/path/to/contents')).rejects.toThrow('PowerISO operations failed');
        });

        it('should throw error when creation fails', async () => {
            mockZx.$.mockReturnValue({
                exitCode: 1,
            });
            
            await expect(create('/path/to/contents')).rejects.toThrow('Failed to create ISO from /path/to/contents');
        });
    });

    describe('convertToBinCue', () => {
        it('should convert ISO to BIN/CUE successfully', async () => {
            const result = await convertToBinCue('/path/to/test.iso');
            
            expect(result).toEqual({
                binPath: '/tmp/test-dir/test.bin',
                cuePath: '/tmp/test-dir/test.cue',
            });
            expect(mockStorageInstance.createTemporaryDirectory).toHaveBeenCalled();
            expect(mockZx.$).toHaveBeenCalledWith(['', ' convert "', '" "', '" "', '"'], 'poweriso', '/path/to/test.iso', '/tmp/test-dir/test.bin', '/tmp/test-dir/test.cue');
        });

        it('should throw error when poweriso is not installed', async () => {
            mockDoesCommandExist.mockResolvedValue(false);
            
            await expect(convertToBinCue('/path/to/test.iso')).rejects.toThrow('PowerISO operations failed');
        });

        it('should throw error when conversion fails', async () => {
            mockZx.$.mockReturnValue({
                exitCode: 1,
            });
            
            await expect(convertToBinCue('/path/to/test.iso')).rejects.toThrow('Failed to convert /path/to/test.iso to BIN/CUE');
        });
    });
}); 