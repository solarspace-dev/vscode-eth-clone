import createClient from "openapi-fetch";

import * as vscode from 'vscode';
import { paths } from "./sourcify";

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "vscode-eth-clone" is now active!');

	context.subscriptions.push(vscode.commands.registerCommand('vscode-eth-clone.cloneContract', async () => {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		console.dir(workspaceFolder);
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
			return;
		}
		let address = await vscode.window.showInputBox({
			'prompt': 'Enter the contract address to clone',
			'placeHolder': '0x1234567890abcdef1234567890abcdef12345678'
		});
		
	}));
}

function cloneContract(address: string) {
	const fs = vscode.workspace.fs;
	if (!address) {return;}
		if (!address.startsWith('0x')) {address = '0x' + address;}

		const sourcify = createClient<paths>({ baseUrl: "https://sourcify.dev/server" });
		try {
			const response = await sourcify.GET('/v2/contract/{chainId}/{address}', {
				params: {
					path: {
						chainId: '1',
						address: address
					},
					query: {
						fields: 'sources',
					}
				}
			});

			if (response.response.status !== 200) {
				const message = (response.error && 'message' in response.error) ? response.error.message : 'Unknown error';
				vscode.window.showErrorMessage(`Failed to fetch contract: ${message}`);
				return;
			}

			await fs.createDirectory(vscode.Uri.joinPath(workspaceFolder.uri, address));
			for (const [fileName, fileContent] of Object.entries(response.data?.sources ?? {})) {
				const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, address, fileName);
				const content = new TextEncoder().encode(fileContent.content);
				await fs.writeFile(fileUri, content);
			}
		} catch (error) {
			const action = await vscode.window.showErrorMessage(`Failed to fetch contract for an unkown reason.`, 'Report Issue');
			if (action === 'Report Issue') {
				const issueUrl = 'https://github.com/solarspace-dev/vscode-eth-clone/issues';
				vscode.env.openExternal(vscode.Uri.parse(issueUrl));
			}
		}
	}
}


// This method is called when your extension is deactivated
export function deactivate() {}
