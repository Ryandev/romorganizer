import fs from 'node:fs/promises';

export class Dat {
    constructor(public system: string) {
        this.games = [];
        this.romsBySha1hex = new Map<string, ROM[]>();
    }

    public games: Game[];
    public romsBySha1hex: Map<string, ROM[]>;
}

export class Game {
    constructor(
        public name: string,
        public dat: Dat
    ) {
        this.roms = [];
    }

    public roms: ROM[];
}

export class ROM {
    constructor(
        public name: string,
        public size: number,
        public sha1hex: string,
        public game: Game
    ) {}
}

export class DatParsingException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DatParsingException';
    }
}

export class DatParser {
    private tagPath: string[] = [];
    private dat: Dat | undefined = undefined;
    private game: Game | undefined = undefined;
    private currentText = '';

    constructor() {}

    start(tag: string, attribs: { [key: string]: string }): void {
        this.tagPath.push(tag);
        this.currentText = '';

        if (this.tagPath.join('.') === 'datafile.game') {
            if (this.game) {
                throw new DatParsingException(
                    'Found a <game> within another <game>'
                );
            }
            if (!this.dat) {
                throw new DatParsingException(
                    'Found a <game> before the <header> was parsed'
                );
            }

            this.game = new Game(
                this.getRequiredAttrib(attribs, 'name'),
                this.dat
            );
        } else if (this.tagPath.join('.') === 'datafile.game.rom') {
            if (!this.game) {
                throw new DatParsingException(
                    'Found a <rom> that was not within a <game>'
                );
            }

            const sizeAttrib = this.getRequiredAttrib(attribs, 'size');
            const size = Number.parseInt(sizeAttrib, 10);
            if (Number.isNaN(size)) {
                throw new DatParsingException(
                    `<rom> has size attribute that is not an integer: ${sizeAttrib}`
                );
            }

            const rom = new ROM(
                this.getRequiredAttrib(attribs, 'name'),
                size,
                this.getRequiredAttrib(attribs, 'sha1'),
                this.game
            );

            this.game.roms.push(rom);

            const romsWithSha1 = this.dat?.romsBySha1hex.get(rom.sha1hex) || [];
            romsWithSha1.push(rom);
            if (this.dat) {
                this.dat.romsBySha1hex.set(rom.sha1hex, romsWithSha1);
            }
        }
    }

    end(): void {
        if (this.tagPath.join('.') === 'datafile.game') {
            if (this.dat && this.game) {
                this.dat.games.push(this.game);
            }
            this.game = undefined;
        }

        this.tagPath.pop();
    }

    text(text: string): void {
        this.currentText += text;

        if (this.tagPath.join('.') === 'datafile.header.name') {
            this.dat = new Dat(this.currentText.trim());
        }
    }

    private getRequiredAttrib(
        attribs: { [key: string]: string },
        name: string
    ): string {
        const value = attribs[name];
        if (!value) {
            throw new DatParsingException(
                `Found a <${this.tagPath.at(-1)}> without a ${name} attribute`
            );
        }
        return value;
    }

    close(): Dat {
        if (!this.dat) {
            throw new DatParsingException(
                'No dat object was created during parsing'
            );
        }
        return this.dat;
    }
}

function parseDatFile(): Dat {
    // Simple implementation that creates a basic Dat object
    // This is a placeholder since the original implementation used xml2js
    const dat = new Dat('Unknown System');
    console.log('Datfile parsing not fully implemented');
    return dat;
}

export async function loadDat(datPath: string): Promise<Dat> {
    //check file extension is .dat
    if (!datPath.endsWith('.dat')) {
        throw new DatParsingException(
            `Dat file must have a .dat extension: ${datPath}`
        );
    }

    console.log(`Loading Datfile "${datPath}"`);
    await fs.readFile(datPath, 'utf8');

    return parseDatFile();
}
