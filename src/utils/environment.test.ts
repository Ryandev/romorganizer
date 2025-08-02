import {
    setEnvironment,
    getEnvironment,
    setTemporaryDirectory,
    getTemporaryDirectory,
    clearTemporaryDirectory,
} from './environment.js';

describe('Environment', () => {
    beforeEach(() => {
        /* Clear environment before each test */
        clearTemporaryDirectory();
    });

    afterEach(() => {
        /* Clear environment after each test */
        clearTemporaryDirectory();
    });

    describe('setEnvironment and getEnvironment', () => {
        it('should set and get environment configuration', () => {
            const config = { temporaryDirectory: '/custom/temp' };
            setEnvironment(config);

            const result = getEnvironment();
            expect(result.temporaryDirectory).toBe('/custom/temp');
        });

        it('should merge environment configurations', () => {
            setEnvironment({ temporaryDirectory: '/temp1' });
            setEnvironment({ temporaryDirectory: '/temp2' });

            const result = getEnvironment();
            expect(result.temporaryDirectory).toBe('/temp2');
        });
    });

    describe('setTemporaryDirectory and getTemporaryDirectory', () => {
        it('should set and get temporary directory', () => {
            const tempDir = '/custom/temp/dir';
            setTemporaryDirectory(tempDir);

            const result = getTemporaryDirectory();
            expect(result).toBe(tempDir);
        });

        it('should return undefined when not set', () => {
            const result = getTemporaryDirectory();
            expect(result).toBeUndefined();
        });
    });

    describe('clearTemporaryDirectory', () => {
        it('should clear temporary directory setting', () => {
            setTemporaryDirectory('/custom/temp');
            expect(getTemporaryDirectory()).toBe('/custom/temp');

            clearTemporaryDirectory();
            expect(getTemporaryDirectory()).toBeUndefined();
        });

        it('should not affect other environment settings', () => {
            setEnvironment({ temporaryDirectory: '/temp' });
            expect(getEnvironment().temporaryDirectory).toBe('/temp');

            clearTemporaryDirectory();
            expect(getTemporaryDirectory()).toBeUndefined();
        });
    });
});
