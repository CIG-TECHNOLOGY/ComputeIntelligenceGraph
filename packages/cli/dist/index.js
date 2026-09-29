#!/usr/bin/env node
/**
 * CIG CLI — main entry point
 *
 * Defines the root commander.js program with global flags and registers all
 * top-level commands.  Individual command implementations live in ./commands/.
 */
import { Command } from 'commander';
import { loadCliEnv } from './env.js';
import { CLI_VERSION } from './version.js';
loadCliEnv();
// ---------------------------------------------------------------------------
// Root program
// ---------------------------------------------------------------------------
export const program = new Command('cig')
    .version(CLI_VERSION, '-v, --version', 'Print the CLI version')
    .description('Compute Intelligence Graph — node onboarding and management CLI')
    // Global flags (Requirements 4.11–4.16)
    .option('--mode <mode>', 'Operational mode: managed (default) or self-hosted', (value) => {
    if (value !== 'managed' && value !== 'self-hosted') {
        throw new Error('--mode must be "managed" or "self-hosted"');
    }
    return value;
}, 'managed')
    .option('--cloud <cloud>', 'Cloud provider: aws or gcp', (value) => {
    if (value !== 'aws' && value !== 'gcp') {
        throw new Error('--cloud must be "aws" or "gcp"');
    }
    return value;
})
    .option('--profile <profile>', 'Install profile: core (default) or full', (value) => {
    if (value !== 'core' && value !== 'full') {
        throw new Error('--profile must be "core" or "full"');
    }
    return value;
}, 'core')
    .option('--target <target>', 'Target environment: local (default), ssh, or host', (value) => {
    if (value !== 'local' && value !== 'ssh' && value !== 'host') {
        throw new Error('--target must be "local", "ssh", or "host"');
    }
    return value;
}, 'local')
    .option('--manifest <manifest>', 'URL or base64-encoded SetupManifest')
    .option('--token <token>', 'Enrollment token for re-enrollment');
// ---------------------------------------------------------------------------
// Helper: resolve global options from the root program
// ---------------------------------------------------------------------------
export function getGlobalOptions() {
    return program.opts();
}
// ---------------------------------------------------------------------------
// Command registrations (Requirements 4.1–4.10)
// ---------------------------------------------------------------------------
// login — Requirement 4.1
program
    .command('login')
    .description('Authenticate the operator via Authentik OIDC device authorization flow (managed mode)')
    .option('--api-url <url>', 'Control plane API URL', 'http://localhost:3003')
    .action(async (opts) => {
    const { login } = await import('./commands/login.js');
    await login(opts.apiUrl);
});
// logout — Requirement 4.2
program
    .command('logout')
    .description('Clear stored operator credentials')
    .option('--api-url <url>', 'Control plane API URL', 'http://localhost:3003')
    .action(async (opts) => {
    const { logout } = await import('./commands/logout.js');
    await logout(opts.apiUrl);
});
// install — Requirement 4.3
program
    .command('install')
    .description('Install the CIG Node runtime in the target environment')
    .option('--mode <mode>', 'Override global --mode for this command')
    .option('--cloud <cloud>', 'Override global --cloud for this command')
    .option('--profile <profile>', 'Override global --profile for this command')
    .option('--target <target>', 'Override global --target for this command')
    .option('--manifest <manifest>', 'Override global --manifest for this command')
    .option('--api-url <url>', 'Control plane API URL', 'http://localhost:3003')
    .option('--ssh-host <host>', 'SSH host (required when --target ssh)')
    .option('--ssh-user <user>', 'SSH user (default: root)', 'root')
    .option('--ssh-key-path <path>', 'Path to SSH private key file')
    .option('--ssh-port <port>', 'SSH port (default: 22)', '22')
    .option('--inference <inference>', 'Self-hosted inference: ollama, gemma, or openai', (value) => {
    if (value !== 'ollama' && value !== 'gemma' && value !== 'openai') {
        throw new Error('--inference must be "ollama", "gemma", or "openai"');
    }
    return value;
})
    .option('--demo', 'Include demo/mock data in the installation')
    .action(async (cmdOpts) => {
    const globals = getGlobalOptions();
    const mode = (cmdOpts['mode'] ?? globals.mode);
    const profile = (cmdOpts['profile'] ?? globals.profile);
    const target = (cmdOpts['target'] ?? globals.target);
    const manifestArg = cmdOpts['manifest'] ?? globals.manifest;
    const apiUrl = cmdOpts['apiUrl'] ?? 'http://localhost:3003';
    const { install } = await import('./commands/install.js');
    await install({
        manifest: manifestArg,
        mode,
        profile,
        target,
        apiUrl,
        sshHost: cmdOpts['sshHost'],
        sshUser: cmdOpts['sshUser'] ?? 'root',
        sshKeyPath: cmdOpts['sshKeyPath'],
        sshPort: cmdOpts['sshPort'] ? parseInt(cmdOpts['sshPort'], 10) : 22,
        inference: cmdOpts['inference'],
        demo: typeof cmdOpts['demo'] === 'boolean' ? cmdOpts['demo'] : undefined,
    });
});
// enroll — Requirement 4.4
program
    .command('enroll')
    .description('Re-enroll an existing CIG Node without reinstalling')
    .option('--token <token>', 'Enrollment token (Enrollment_Token) for re-enrollment')
    .option('--node-id <nodeId>', 'Node ID to re-enroll (optional)')
    .option('--profile <profile>', 'Override global --profile for this command')
    .option('--api-url <url>', 'Control plane API URL', 'http://localhost:3003')
    .action(async (cmdOpts) => {
    const globals = getGlobalOptions();
    const token = cmdOpts['token'] ?? globals.token;
    const nodeId = cmdOpts['nodeId'];
    const profile = (cmdOpts['profile'] ?? globals.profile);
    const apiUrl = cmdOpts['apiUrl'] ?? 'http://localhost:3003';
    const { enroll } = await import('./commands/enroll.js');
    await enroll({ apiUrl, profile, token, nodeId });
});
// status — Requirement 4.5
program
    .command('status')
    .description('Report CIG Node runtime health and enrollment state')
    .option('--json', 'Output status as JSON', false)
    .action(async (cmdOpts) => {
    const { status } = await import('./commands/status.js');
    await status(cmdOpts.json);
});
// doctor — Requirement 4.6
program
    .command('doctor')
    .description('Validate prerequisites without installing')
    .option('--target <target>', 'Target type: local, ssh, or host (overrides global --target)')
    .option('--ssh-host <host>', 'SSH host to check reachability for (required when --target ssh)')
    .option('--ssh-key-path <path>', 'Path to SSH private key file (required when --target ssh)')
    .option('--control-plane-url <url>', 'Control plane URL to check reachability against', 'https://api.cig.lat')
    .action(async (cmdOpts) => {
    const globals = getGlobalOptions();
    const { doctor } = await import('./commands/doctor.js');
    await doctor({
        target: cmdOpts.target ?? globals.target,
        sshHost: cmdOpts.sshHost,
        sshKeyPath: cmdOpts.sshKeyPath,
        controlPlaneUrl: cmdOpts.controlPlaneUrl,
    });
});
// open — Requirement 4.7
program
    .command('open')
    .description('Open the Dashboard URL in the default browser')
    .action(async () => {
    const { openDashboard } = await import('./commands/open.js');
    await openDashboard();
});
// permissions — Requirement 4.8
program
    .command('permissions')
    .description('Display the current permission tier and list permissions required for each tier')
    .action(async () => {
    const { permissions } = await import('./commands/permissions.js');
    await permissions();
});
// upgrade — Requirement 4.9
program
    .command('upgrade')
    .description('Upgrade the CIG Node runtime to a newer version')
    .action(async () => {
    const { upgrade } = await import('./commands/upgrade.js');
    await upgrade();
});
// uninstall — Requirement 4.10
program
    .command('uninstall')
    .description('Remove the CIG Node runtime and optionally purge data volumes')
    .option('--purge-data', 'Delete the installation directory as well', false)
    .action(async (cmdOpts) => {
    const { uninstall } = await import('./commands/uninstall.js');
    await uninstall(cmdOpts.purgeData);
});
// setup — interactive wizard (used by install.sh)
program
    .command('setup')
    .description('Interactive setup wizard for bootstrapping a CIG Node')
    .option('--mode <mode>', 'Installation mode: managed or self-hosted')
    .option('--profile <profile>', 'Installation profile: core, discovery, or full')
    .option('--api-url <url>', 'Control plane API URL')
    .option('--inference <inference>', 'Self-hosted inference: ollama, gemma, or openai', (value) => {
    if (value !== 'ollama' && value !== 'gemma' && value !== 'openai') {
        throw new Error('--inference must be "ollama", "gemma", or "openai"');
    }
    return value;
})
    .option('--demo', 'Include demo data in the installation')
    .action(async (cmdOpts) => {
    const { setup } = await import('./commands/setup.js');
    await setup({
        mode: cmdOpts.mode,
        profile: cmdOpts.profile,
        apiUrl: cmdOpts.apiUrl,
        inference: cmdOpts.inference,
        // undefined when flag not passed → wizard will prompt; true when --demo passed → skip prompt
        demo: cmdOpts.demo,
    });
});
// bootstrap-reset — self-hosted only
program
    .command('bootstrap-reset')
    .description('Generate a new Bootstrap Token (self-hosted mode only)')
    .action(async () => {
    const { bootstrapReset } = await import('./commands/bootstrap-reset.js');
    await bootstrapReset();
});
// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    await program.parseAsync(process.argv);
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
//# sourceMappingURL=index.js.map