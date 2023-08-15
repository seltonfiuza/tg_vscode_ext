// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

const awsConfigFilePath = path.join(os.homedir(), '.aws', 'config');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let NEXT_TERM_ID = 1;
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "terragrunt-plan" is now active!');
	
	context.subscriptions.push(vscode.commands.registerCommand('terragrunt.plan', async (uri:vscode.Uri) => {

		if (!checkForTerragruntHclFile(uri.path)) {
			vscode.window.showErrorMessage('Not a Terragrunt project.');
			return
		}
		const awsProfiles: string[] = await getAwsProfiles();

		const quickPickItems = awsProfiles.map(profile => ({
			label: profile,
			description: 'AWS Profile'
		}));

		const profile = await vscode.window.showQuickPick(quickPickItems, {
            placeHolder: 'Select AWS Profile',
			canPickMany: false,
        });

        if (profile) {
            vscode.window.showInformationMessage(`Selected profile: ${profile.label}`);
            // Here you can use the selected profile for your AWS operations.
        } else {
            vscode.window.showErrorMessage('No profile selected.');
			return
        }

		// let folderName = uri.path.split('/')[uri.path.split('/').length - 1];

		let terminalWindow = vscode.window.createTerminal(`Tg Plan #${NEXT_TERM_ID++}`);

		terminalWindow.sendText(`cd ${uri.path}\r\n`)
		terminalWindow.sendText(`terragrunt plan\r\n`)

		if (ensureTerminalExists()) {
			terminalWindow.show()
		}
	}));
}

// This method is called when your extension is deactivated
export function deactivate() {}

function ensureTerminalExists(): boolean {
	if ((<any>vscode.window).terminals.length === 0) {
		vscode.window.showErrorMessage('No active terminals');
		return false;
	}
	return true;
}

function checkForTerragruntHclFile(folderPath: string): boolean {
    const fileNameToCheck = 'terragrunt.hcl';
	let hasTerragruntHclFile = false
    let files = fs.readdirSync(folderPath);
	hasTerragruntHclFile = files.includes(fileNameToCheck);
	return hasTerragruntHclFile;
}

function getAwsProfiles(): Promise<string[]> {
    return new Promise((resolve, reject) => {
        fs.readFile(awsConfigFilePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
                return;
            }

            const profiles = parseAwsConfig(data);
            resolve(profiles);
        });
    });
}

function parseAwsConfig(data: string): string[] {
    const lines = data.split('\n');
    const profiles: string[] = [];

    let currentProfile: string | null = null;

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
            currentProfile = trimmedLine.slice(1, -1).trim();
            if (currentProfile.startsWith('profile ')) {
                currentProfile = currentProfile.substring(8);
            }
        } else if (currentProfile && trimmedLine.startsWith('region')) {
            profiles.push(currentProfile);
            currentProfile = null;
        }
    }

    return profiles;
}