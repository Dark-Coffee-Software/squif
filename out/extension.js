"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const axios_1 = require("axios");
const https = require("https");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "squif" is now active!');
    let checker = vscode.commands.registerCommand('squif.checker', () => {
        let folders = vscode.workspace.workspaceFolders;
        let folder = folders !== undefined ? folders[0] : undefined;
        if (!fs.existsSync((folder === null || folder === void 0 ? void 0 : folder.uri.fsPath) + "\\squif.jsonc")) {
            vscode.window.showWarningMessage('No Squif config found.');
            return;
        }
        let config = {};
        try {
            config = JSON.parse(fs.readFileSync(path.normalize((folder === null || folder === void 0 ? void 0 : folder.uri.fsPath) + "\\squif.jsonc"), 'utf8'));
        }
        catch (ex) {
            var e = ex;
            vscode.window.showErrorMessage("Error in confing .squif.jsonc:");
            return;
        }
        if (config.projects == null || config.projects == []) {
            vscode.window.showErrorMessage("No projects were found in your config. Please add one.");
        }
        else {
            vscode.window.showInformationMessage("Found " + config.projects.length + " projects in config. Fetching snippets...");
            config.projects.forEach((v) => {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
                vscode.window.showInformationMessage("Fetching https://raw.githubusercontent.com/darynvanv/squif-documentations/main/" + v + ".json");
                try {
                    const agent = new https.Agent({
                        rejectUnauthorized: false
                    });
                    let sel = { scheme: 'file', language: 'sqf' };
                    axios_1.default({
                        url: "https://raw.githubusercontent.com/darynvanv/squif-documentations/main/" + v + ".json",
                        method: 'GET',
                        responseType: 'json',
                        httpsAgent: agent
                    })
                        .then(res => {
                        console.log(res);
                        vscode.window.showInformationMessage("Imported " + Object.keys(res.data).length + " snippets for " + v);
                        Object.values(res.data).forEach((s, i) => {
                            context.subscriptions.push(vscode.languages.registerCompletionItemProvider(sel, new SquifCompletionItemProvider(s.prefix, s.body[0], s.description), s.prefix));
                            context.subscriptions.push(vscode.languages.registerHoverProvider(sel, new SquifHoverProvider(s.prefix, s.description)));
                            context.subscriptions.push(vscode.languages.registerDefinitionProvider(sel, new SquifDefinitionProvider(s.prefix, s.docUrl)));
                        });
                    })
                        .catch(error => {
                        console.log(error);
                        vscode.window.showErrorMessage(error.response);
                    });
                }
                catch (ex) {
                    console.log(ex);
                }
            });
        }
    });
    context.subscriptions.push(checker);
}
exports.activate = activate;
class SquifCompletionItemProvider {
    constructor(label, inserts, summary) {
        this._inserts = [];
        this._inserts.push({ label: label, insertText: inserts, detail: summary });
    }
    provideCompletionItems(document, position, token) {
        return this._inserts;
    }
}
class SquifHoverProvider {
    constructor(word, summary) {
        this._hover = {};
        this._word = "";
        this._summary = "";
        this._word = word;
        this._summary = summary;
    }
    provideHover(document, position, token) {
        const range = document.getWordRangeAtPosition(position);
        const word = document.getText(range);
        if (word === this._word) {
            return {
                contents: [this._word, this._summary]
            };
        }
        else {
            return { contents: ["", ""] };
        }
    }
}
class SquifDefinitionProvider {
    constructor(word, uri) {
        this._word = "";
        this._uri = "";
        this._word = word;
        this._uri = uri;
    }
    provideDefinition(document, position, token) {
        const range = document.getWordRangeAtPosition(position);
        const word = document.getText(range);
        if (word === this._word) {
            return {
                uri: vscode.Uri.parse(this._uri, false),
                range: range
            };
        }
        else {
            return null;
        }
    }
}
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map