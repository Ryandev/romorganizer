import { findCuesheetEntryForGame, findAndLoadCuesheetForGame } from './cuesheetLoader';

describe('CuesheetLoader', () => {
    describe('findCuesheetEntryForGame', () => {
        it('should find cuesheet entry by exact name match', () => {
            const cuesheetEntries = [
                {
                    name: 'Test Game',
                    path: '/test.cue',
                    load: async () => ({ name: 'Test Game', content: 'test content', path: '/test.cue' })
                },
                {
                    name: 'Another Game',
                    path: '/another.cue',
                    load: async () => ({ name: 'Another Game', content: 'another content', path: '/another.cue' })
                }
            ];
            
            const result = findCuesheetEntryForGame(cuesheetEntries, 'Test Game');
            expect(result).toBeDefined();
            expect(result?.name).toBe('Test Game');
        });

        it('should find cuesheet entry by case-insensitive match', () => {
            const cuesheetEntries = [
                {
                    name: 'Test Game',
                    path: '/test.cue',
                    load: async () => ({ name: 'Test Game', content: 'test content', path: '/test.cue' })
                }
            ];
            
            const result = findCuesheetEntryForGame(cuesheetEntries, 'test game');
            expect(result).toBeDefined();
            expect(result?.name).toBe('Test Game');
        });

        it('should return undefined when no match found', () => {
            const cuesheetEntries = [
                {
                    name: 'Test Game',
                    path: '/test.cue',
                    load: async () => ({ name: 'Test Game', content: 'test content', path: '/test.cue' })
                }
            ];
            
            const result = findCuesheetEntryForGame(cuesheetEntries, 'Non Existent Game');
            expect(result).toBeUndefined();
        });
    });

    describe('findAndLoadCuesheetForGame', () => {
        it('should find and load cuesheet by name', async () => {
            const cuesheetEntries = [
                {
                    name: 'Test Game',
                    path: '/test.cue',
                    load: async () => ({ name: 'Test Game', content: 'test content', path: '/test.cue' })
                }
            ];
            
            const result = await findAndLoadCuesheetForGame(cuesheetEntries, 'Test Game');
            expect(result).toBeDefined();
            expect(result?.name).toBe('Test Game');
            expect(result?.content).toBe('test content');
        });

        it('should return undefined when no match found', async () => {
            const cuesheetEntries = [
                {
                    name: 'Test Game',
                    path: '/test.cue',
                    load: async () => ({ name: 'Test Game', content: 'test content', path: '/test.cue' })
                }
            ];
            
            const result = await findAndLoadCuesheetForGame(cuesheetEntries, 'Non Existent Game');
            expect(result).toBeUndefined();
        });
    });
}); 