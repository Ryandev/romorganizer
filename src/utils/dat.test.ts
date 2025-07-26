import { Dat, Game, ROM } from './dat';

describe('Dat Classes', () => {
    it('should create Dat object with correct properties', () => {
        const dat = new Dat('Test System');
        expect(dat.system).toBe('Test System');
        expect(dat.games).toEqual([]);
        expect(dat.romsBySha1hex).toBeInstanceOf(Map);
        expect(dat.romsBySha1hex.size).toBe(0);
    });

    it('should create Game object with correct properties', () => {
        const dat = new Dat('Test System');
        const game = new Game('Test Game', dat);
        expect(game.name).toBe('Test Game');
        expect(game.dat).toBe(dat);
        expect(game.roms).toEqual([]);
    });

    it('should create ROM object with correct properties', () => {
        const dat = new Dat('Test System');
        const game = new Game('Test Game', dat);
        const rom = new ROM('test.bin', 1024, 'abc123', game);
        expect(rom.name).toBe('test.bin');
        expect(rom.size).toBe(1024);
        expect(rom.sha1hex).toBe('abc123');
        expect(rom.game).toBe(game);
    });

    it('should add ROM to game and dat index', () => {
        const dat = new Dat('Test System');
        const game = new Game('Test Game', dat);
        const rom = new ROM('test.bin', 1024, 'abc123', game);

        game.roms.push(rom);
        dat.games.push(game);

        const romsWithSha1 = dat.romsBySha1hex.get(rom.sha1hex) || [];
        romsWithSha1.push(rom);
        dat.romsBySha1hex.set(rom.sha1hex, romsWithSha1);

        expect(game.roms).toHaveLength(1);
        expect(dat.games).toHaveLength(1);
        expect(dat.romsBySha1hex.get('abc123')).toHaveLength(1);
        expect(dat.romsBySha1hex.get('abc123')?.[0]).toBe(rom);
    });
});
