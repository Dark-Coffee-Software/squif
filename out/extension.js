"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const XRegExp = require("xregexp");
XRegExp.install('namespacing');
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "squif" is now active!');
    let disposable = vscode.commands.registerCommand('squif.test', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Squif enabled: v' + require('../package.json').version);
    });
    let checker = vscode.commands.registerCommand('squif.checker', () => {
        vscode.window.showInformationMessage('Checking A3_Modules Folder...');
        let folders = vscode.workspace.workspaceFolders;
        let folder = folders !== undefined ? folders[0] : undefined;
        if (!fs.existsSync((folder === null || folder === void 0 ? void 0 : folder.uri.fsPath) + "\\.squif.jsonc")) {
            vscode.window.showWarningMessage('No Modules config found.\nCreating... ');
            fs.writeFileSync(path.normalize((folder === null || folder === void 0 ? void 0 : folder.uri.fsPath) + "\\.squif.jsonc"), `
{
	"module_dir": "\\a3modules" 
	// Use \\ for local to this folder, otherwise give the absolute path (i.e. C:\\path\\to\\mod\\source\\dir)
}`);
            return;
        }
        let config = {};
        try {
            config = JSON.parse(fs.readFileSync(path.normalize((folder === null || folder === void 0 ? void 0 : folder.uri.fsPath) + "\\.squif.jsonc"), 'utf8'));
        }
        catch (ex) {
            let e = ex;
            vscode.window.showErrorMessage("Error in confing .squif.jsonc:\n" + e.message);
            return;
        }
        if (config.module_dir === undefined) {
            vscode.window.showErrorMessage("Error in confing .squif - No module path set");
        }
        let moduleFolder = "";
        // Check if the Module Dir should be local or absolute
        if (config.module_dir.startsWith("\\")) {
            moduleFolder = (folder === null || folder === void 0 ? void 0 : folder.uri.fsPath) + config.module_dir;
        }
        else {
            moduleFolder = config.module_dir;
        }
        // Check if the defined Module Directory exists
        if (!fs.existsSync(moduleFolder)) {
            vscode.window.showErrorMessage('Error locating\n"' + moduleFolder + '".');
            vscode.window.showErrorMessage('No Modules folder found! Please ensure you have set a valid path on the config file!".');
            return;
        }
        if (folder === null) {
            return;
        }
        let files = [];
        let funcFiles = [];
        let cppFiles = [];
        let hppFiles = [];
        let registeredClasses = [];
        walk((folder === null || folder === void 0 ? void 0 : folder.uri.fsPath) + "\\a3modules", (err, result) => {
            files = result !== null && result !== void 0 ? result : [];
            files.forEach((val, ind) => {
                if (val.endsWith(".cpp")) {
                    // This is an CPP file. Proceed
                    cppFiles.push(val.replace("\\\\", "\\"));
                }
                if (val.endsWith(".hpp")) {
                    // This is an HPP file. Proceed
                    hppFiles.push(val.replace("\\\\", "\\"));
                }
            });
            vscode.window.showInformationMessage('Found ' + funcFiles.length + ' valid Files.');
            if (cppFiles.length > 0) {
                cppFiles.forEach((v, i) => {
                    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                    var content = fs.readFileSync(path.normalize(cppFiles[i]), { encoding: 'utf8', flag: 'r' });
                    var classObj = {
                        name: "",
                        fileDir: "",
                        classes: []
                    };
                    let funcCont = (_b = (_a = scrapeFunctions(content)) === null || _a === void 0 ? void 0 : _a.groups) === null || _b === void 0 ? void 0 : _b.Functions;
                    if (funcCont !== undefined) {
                        classObj.name = (_d = (_c = getClass(funcCont)) === null || _c === void 0 ? void 0 : _c.Class) !== null && _d !== void 0 ? _d : "";
                        let classCont = (_f = (_e = scrapeUserFunc(funcCont)) === null || _e === void 0 ? void 0 : _e.groups) === null || _f === void 0 ? void 0 : _f.Classes;
                        if (classCont !== undefined) {
                            let cl = {};
                            cl.name = (_h = (_g = getClass(classCont)) === null || _g === void 0 ? void 0 : _g.Class) !== null && _h !== void 0 ? _h : "";
                            let subClassCont = (_k = (_j = scrapeUserFunc(classCont)) === null || _j === void 0 ? void 0 : _j.groups) === null || _k === void 0 ? void 0 : _k.Classes;
                            cl.classes = subClassCont;
                            if (subClassCont !== undefined) {
                                let clsses = extractClasses(subClassCont);
                                if (clsses.length > 0) {
                                    clsses.forEach((fv, fi) => {
                                        var _a, _b;
                                        try {
                                            let cls = {
                                                name: fv
                                            };
                                            console.log("Looping: " + fv);
                                            let fnFileName = "fn_" + fv + ".sqf";
                                            var fileContents = (_a = fs.readFileSync(path.normalize(path.dirname(cppFiles[i]) + "\\functions\\" + fnFileName), { encoding: 'utf8', flag: 'r' })) !== null && _a !== void 0 ? _a : "";
                                            cls.comments = (_b = getComments(fileContents)) === null || _b === void 0 ? void 0 : _b.Comments;
                                            classObj.classes.push(cls);
                                        }
                                        catch (ex) {
                                            let e = ex;
                                            console.log(e.message);
                                        }
                                    });
                                }
                            }
                        }
                    }
                    registeredClasses.push(classObj);
                });
            }
            registeredClasses.forEach((v, i) => {
                v.classes.forEach((vc, ic) => {
                    let autoComp = v.name + "_fnc_" + vc.name;
                    console.log(vc);
                    vscode.languages.registerCompletionItemProvider('sqf', {
                        provideCompletionItems(document, pos, token, ctx) {
                            let comp = new vscode.CompletionItem(autoComp, vscode.CompletionItemKind.Function);
                            return [
                                comp
                            ];
                        }
                    }, autoComp);
                    vscode.languages.registerHoverProvider('sqf', {
                        provideHover(document, pos, token) {
                            const range = document.getWordRangeAtPosition(pos);
                            const word = document.getText(range);
                            if (word === autoComp) {
                                return {
                                    contents: [autoComp, vc.comments]
                                };
                            }
                        }
                    });
                });
            });
        });
    });
    context.subscriptions.push(checker);
    context.subscriptions.push(disposable);
}
exports.activate = activate;
const walk = (dir, done, filter) => {
    let results = [];
    fs.readdir(dir, function (err, list) {
        if (err) {
            return done(err);
        }
        let pending = list.length;
        if (!pending) {
            return done(null, results);
        }
        list.forEach((file) => {
            file = path.resolve(dir, file);
            fs.stat(file, (err2, stat) => {
                if (stat && stat.isDirectory()) {
                    walk(file, (err3, res) => {
                        if (res) {
                            results = results.concat(res);
                        }
                        if (!--pending) {
                            done(null, results);
                        }
                    }, filter);
                }
                else {
                    if (typeof filter === 'undefined' || (filter && filter(file))) {
                        results.push(file);
                    }
                    if (!--pending) {
                        done(null, results);
                    }
                }
            });
        });
    });
};
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
function scrapeFunctions(content) {
    const reg = XRegExp(/class CfgFunctions[\s\n\r]*{(?<Functions>.*)};/gims);
    let match = XRegExp.exec(content, reg);
    return match;
}
function scrapeUserFunc(content) {
    const reg = XRegExp(/class (.*?){(?<Classes>.*)};/gims);
    let match = XRegExp.exec(content, reg);
    return match;
}
function scrapeFile(content) {
    const reg = XRegExp(/((params (?<year>\[(.*?)\]);))/gims);
    let match = XRegExp.exec(content, reg);
    return match;
}
function procFile(file) {
    var _a, _b, _c;
    let params = JSON.parse((_c = (_b = (_a = scrapeFile(file)) === null || _a === void 0 ? void 0 : _a.groups) === null || _b === void 0 ? void 0 : _b.year) !== null && _c !== void 0 ? _c : "[]");
    let funcFileName = path.basename(file);
    let funcName = funcFileName.replace("fn_", "").split(".")[0];
    let autoComp = "[" + params.join(", ") + "] call " + funcName;
    return {
        funcName: funcName,
        funcFileName: funcFileName,
        params: params,
        autoComp: autoComp
    };
}
function getClass(content) {
    const reg = XRegExp(/class (?<Class>\w*)?/gims);
    let match = XRegExp.exec(content, reg);
    return match === null || match === void 0 ? void 0 : match.groups;
}
function getComments(content = "") {
    const reg = XRegExp(/\/\*(?<Comments>.*?)\*\//gims);
    let match = XRegExp.exec(content, reg);
    return match === null || match === void 0 ? void 0 : match.groups;
}
function getFuncPath(content = "") {
    const reg = XRegExp(/\/\*(?<Comments>.*?)\*\//gims);
    let match = XRegExp.exec(content, reg);
    return match === null || match === void 0 ? void 0 : match.groups;
}
function extractClasses(content) {
    let arr = [];
    const reg = XRegExp(/class (.*?){.*?};/gims);
    XRegExp.forEach(content, reg, (match, i) => {
        arr.push(match[1].split(" ")[0].split("\\")[0]);
    });
    return arr;
}
//# sourceMappingURL=extension.js.map