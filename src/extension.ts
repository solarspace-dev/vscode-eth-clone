import createClient from "openapi-fetch";

import * as vscode from 'vscode';
import { paths } from "./sourcify";

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "eth-clone" is now active!');

	const push = context.subscriptions.push.bind(context.subscriptions);
	const registerCommand = vscode.commands.registerCommand.bind(vscode.commands);

	push(registerCommand('eth-clone.cloneContract', async () => {
		const fs = vscode.workspace.fs;
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
				await fs.writeFile(fileUri, Buffer.from(fileContent.content ?? '', 'utf-8'));
			}
		} catch (error) {
			const action = await vscode.window.showErrorMessage(`Failed to fetch contract for an unkown reason.`, 'Report Issue');
			if (action === 'Report Issue') {
				const issueUrl = 'https://github.com/RaoulSchaffranek/eth-clone/issues';
				vscode.env.openExternal(vscode.Uri.parse(issueUrl));
			}
		}
	}));

}

// This method is called when your extension is deactivated
export function deactivate() {}
