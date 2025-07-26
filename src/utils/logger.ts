export const log = {
    banner: (message: string): void => {
        console.log('');
        console.log(
            '#########################################################'
        );
        console.log(message);
        console.log(
            '#########################################################'
        );
        console.log('');
    },
    info: (message: string): void => {
        console.log(`-  ${message}`);
    },
    warn: (message: string): void => {
        console.log(`!  ${message}`);
    },
    error: (message: string): void => {
        console.error(`Error: ${message}`);
    },
};
