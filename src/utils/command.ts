import { $ } from 'zx';

async function doesCommandExist(command: string): Promise<boolean> {
    try {
        const exitCode = await $`which ${command}`.exitCode;
        return exitCode === 0;
    } catch {
        // If which command fails or times out, assume command doesn't exist
        return false;
    }
}

async function isCommandExecutable(command: string): Promise<boolean> {
    try {
        const result = await $`command -v ${command}`;
        const commandPath = result.stdout.toString().trim();
        const exitCode = await $`test -x ${commandPath}`.exitCode;
        return exitCode === 0;
    } catch {
        return false
    }
}

export { doesCommandExist, isCommandExecutable };