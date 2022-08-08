// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as https from "https";


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "squif" is now active!');

	let checker = vscode.commands.registerCommand('squif.checker', () => {
				
		let folders = vscode.workspace.workspaceFolders;
		let folder = folders !== undefined ? folders[0] : undefined;

		if(! fs.existsSync(folder?.uri.fsPath + "\\squif.jsonc"))
		{
			vscode.window.showWarningMessage('No Squif config found.'  );
			return;
		}

		let config:any = {};

		try
		{			
			config = JSON.parse(fs.readFileSync(path.normalize(folder?.uri.fsPath + "\\squif.jsonc"), 'utf8'));
		}
		catch(ex)
		{
			var e = ex;
			vscode.window.showErrorMessage("Error in confing .squif.jsonc:");
			return;
		}

		if(config.projects == null || config.projects == [])
		{			
			vscode.window.showErrorMessage("No projects were found in your config. Please add one.");
		}
		else
		{
			vscode.window.showInformationMessage("Found " + config.projects.length + " projects in config. Fetching snippets...");
			config.projects.forEach((v: string) => {
				process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
				vscode.window.showInformationMessage("Fetching https://raw.githubusercontent.com/darynvanv/squif-documentations/main/" + v + ".json");
				try {
					const agent = new https.Agent({
						rejectUnauthorized: false
					});


					let sel:vscode.DocumentSelector = { scheme: 'file', language: 'sqf' };


					axios(
					{
						url: "https://raw.githubusercontent.com/darynvanv/squif-documentations/main/" + v + ".json",
						method: 'GET',
						responseType: 'json',
						httpsAgent: agent
					})
					.then(res => {
						console.log(res);
						vscode.window.showInformationMessage("Imported " + Object.keys(res.data).length + " snippets for " + v);
						Object.values(res.data).forEach((s: any, i: number) => {		
							context.subscriptions.push(
								vscode.languages.registerCompletionItemProvider(
									sel, new SquifCompletionItemProvider(s.prefix, s.body[0], s.description), s.prefix)
							);
							context.subscriptions.push(
								vscode.languages.registerHoverProvider(
									sel, new SquifHoverProvider(s.prefix, s.description)));
							context.subscriptions.push(
							vscode.languages.registerDefinitionProvider(
								sel, new SquifDefinitionProvider(s.prefix, s.docUrl)));
						});

						
					})
					.catch(error => {						
						console.log(error);
						vscode.window.showErrorMessage(error.response);
					});
				}
				catch(ex:any)
				{
					console.log(ex);
				}
			});
		}
		


	});

	context.subscriptions.push(checker);
}

class SquifCompletionItemProvider implements vscode.CompletionItemProvider {

	public _inserts:any = [];

	constructor (label: string, inserts: string, summary?: string)
	{
		this._inserts.push({ label: label, insertText: inserts, detail: summary});
	}

    public provideCompletionItems(
        document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        vscode.CompletionItem[] {
			return this._inserts;
    }
}

class SquifHoverProvider implements vscode.HoverProvider {
	
	public _hover:any = {};
	public _word:string = "";
	public _summary:string = "";

	constructor (word: string, summary: string)
	{
		this._word = word;
		this._summary = summary;
	}

    public provideHover(
        document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        vscode.Hover {
			const range = document.getWordRangeAtPosition(position);
			const word = document.getText(range);
			if(word === this._word)
			{
				return {
					contents: [this._word, this._summary]
				};
			}
			else
			{
				return { contents: ["", ""]};
			}
    }
}

class SquifDefinitionProvider implements vscode.DefinitionProvider {

	public _word:string = "";
	public _uri:string = "";

	constructor (word: string, uri: string)
	{
		this._word = word;
		this._uri = uri;
	}

    public provideDefinition(
        document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        vscode.Location {
			const range = document.getWordRangeAtPosition(position) ;
			const word = document.getText(range);
			if(word === this._word)
			{
				return {
					uri: vscode.Uri.parse( this._uri, false ),
					range: range!
				};
			}
			else
			{
				return null!;
			}
    }
}

// this method is called when your extension is deactivated
export function deactivate() {}
