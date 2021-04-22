// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as XRegExp from 'xregexp';
import { SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION } from 'node:constants';
XRegExp.install('namespacing');


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "squif" is now active!');

	let disposable = vscode.commands.registerCommand('squif.test', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Squif enabled: v' +  require('../package.json').version );
	});


	let checker = vscode.commands.registerCommand('squif.checker', () => {
				
		vscode.window.showInformationMessage('Checking A3_Modules Folder...' );

		let folders = vscode.workspace.workspaceFolders;
		let folder = folders !== undefined ? folders[0] : undefined;

		if(! fs.existsSync(folder?.uri.fsPath + "\\.squif.jsonc"))
		{
			vscode.window.showWarningMessage('No Modules config found.\nCreating... '  );
			fs.writeFileSync(path.normalize(folder?.uri.fsPath + "\\.squif.jsonc"), `
{
	"module_dir": "\\a3modules" 
	// Use \\ for local to this folder, otherwise give the absolute path (i.e. C:\\path\\to\\mod\\source\\dir)
}`);
			return;
		}

		let config:any = {};

		try
		{			
			config = JSON.parse(fs.readFileSync(path.normalize(folder?.uri.fsPath + "\\.squif.jsonc"), 'utf8'));
		}
		catch(ex)
		{
			let e:Error = ex;
			vscode.window.showErrorMessage("Error in confing .squif.jsonc:\n" + e.message);
			return;
		}

		if(config.module_dir === undefined)
		{
			vscode.window.showErrorMessage("Error in confing .squif - No module path set");
		}

		let moduleFolder = "";

		// Check if the Module Dir should be local or absolute
		if(config.module_dir.startsWith("\\"))
		{
			moduleFolder = folder?.uri.fsPath + config.module_dir;
		}
		else
		{
			moduleFolder = config.module_dir;
		}

		// Check if the defined Module Directory exists
		if(! fs.existsSync(moduleFolder))
		{

			vscode.window.showErrorMessage('Error locating\n"' + moduleFolder + '".'  );
			vscode.window.showErrorMessage('No Modules folder found! Please ensure you have set a valid path on the config file!".'  );
			return;
		}


		if(folder === null)
		{
			return;
		}

		let files:string[] = [];
		let funcFiles:string[] = [];
		let cppFiles:any[] = [];
		let hppFiles:any[] = [];

		let registeredClasses:any = [];
		
		walk(folder?.uri.fsPath + "\\a3modules", (err, result) =>
		{
			files = result ?? [];
			
			files.forEach((val, ind) => 
			{
				if(val.endsWith(".cpp"))
				{
					// This is an CPP file. Proceed
					cppFiles.push(val.replace("\\\\", "\\"));
				}
				if(val.endsWith(".hpp"))
				{
					// This is an HPP file. Proceed
					hppFiles.push(val.replace("\\\\", "\\") );
				}
			});
			
			vscode.window.showInformationMessage('Found ' + funcFiles.length + ' valid Files.'  );
			
			if(cppFiles.length > 0)
			{
				cppFiles.forEach((v, i) => {

					var content = fs.readFileSync(path.normalize(cppFiles[i]), {encoding:'utf8', flag:'r'});

					var classObj:any = {
						name: "",
						fileDir: "",
						classes: []
					};
		
					let funcCont = scrapeFunctions( content )?.groups?.Functions;			
					if(funcCont !== undefined)
					{
						classObj.name = getClass(funcCont)?.Class ?? "";
		
						let classCont = scrapeUserFunc( funcCont )?.groups?.Classes;		
						if(classCont !== undefined)
						{
							let cl:any = {};
		
							cl.name = getClass(classCont)?.Class ?? "";
							let subClassCont = scrapeUserFunc( classCont )?.groups?.Classes;
							cl.classes = subClassCont;
							
							if(subClassCont !== undefined)
							{
								let clsses = extractClasses(subClassCont);

								if(clsses.length > 0)
								{
									clsses.forEach( (fv:any, fi:any) =>
									{
										try
										{
											let cls:any = {
												name: fv
											};
											console.log("Looping: " + fv);
											let fnFileName = "fn_" + fv + ".sqf";
											var fileContents = fs.readFileSync(path.normalize(path.dirname(cppFiles[i]) + "\\functions\\" + fnFileName), {encoding:'utf8', flag:'r'}) ?? "";
											cls.comments = getComments(fileContents)?.Comments;
											classObj.classes.push(cls);
										}
										catch(ex)
										{
											let e:Error = ex;
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

			registeredClasses.forEach((v: any, i: any) =>
			{
				v.classes.forEach((vc: any, ic: any) =>
				{
					let autoComp = v.name + "_fnc_" +  vc.name;

					console.log(vc);

					vscode.languages.registerCompletionItemProvider('sqf', {
						provideCompletionItems(document, pos, token, ctx){
							let comp = new vscode.CompletionItem(autoComp, vscode.CompletionItemKind.Function);
							return [
								comp
								];
							}
						},
						autoComp
					);

					vscode.languages.registerHoverProvider('sqf',
					{
						provideHover(document, pos, token)
						{
							const range = document.getWordRangeAtPosition(pos);
            				const word = document.getText(range);
							if(word === autoComp)
							{
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

const walk = (
	dir: string,
	done: (err: Error | null, results?: string[]) => void,
	filter?: (f: string) => boolean
  ) => {
	let results: string[] = [];
	fs.readdir(dir, function (err, list) {
	  if (err) {
		return done(err);
	  }
	  let pending = list.length;
	  if (!pending) {
		return done(null, results);
	  }
	  list.forEach((file: string) => {
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
		  } else {
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
export function deactivate() {}


function scrapeFunctions(content:string)
{
	const reg = XRegExp(/class CfgFunctions[\s\n\r]*{(?<Functions>.*)};/gims);				
	let match = XRegExp.exec(content, reg);
	return match;
}

function scrapeUserFunc(content:string)
{
	const reg = XRegExp(/class (.*?){(?<Classes>.*)};/gims);				
	let match = XRegExp.exec(content, reg);
	return match;
}

function scrapeFile(content:string)
{
	const reg = XRegExp(/((params (?<year>\[(.*?)\]);))/gims);				
	let match = XRegExp.exec(content, reg);

	return match;
}

function procFile(file:string)
{
	
	let params = JSON.parse( scrapeFile(file)?.groups?.year ?? "[]" );
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

function getClass(content:string)
{
	const reg = XRegExp(/class (?<Class>\w*)?/gims);				
	let match = XRegExp.exec(content, reg);

	return match?.groups;
}

function getComments(content:string = "")
{
	const reg = XRegExp(/\/\*(?<Comments>.*?)\*\//gims);				
	let match = XRegExp.exec(content, reg);

	return match?.groups;
}

function getFuncPath(content:string = "")
{
	const reg = XRegExp(/\/\*(?<Comments>.*?)\*\//gims);				
	let match = XRegExp.exec(content, reg);

	return match?.groups;
}

function extractClasses(content:string)
{
	let arr:any = [];

	const reg = XRegExp(/class (.*?){.*?};/gims);		
	XRegExp.forEach(content, reg, (match, i) => {
		arr.push(match[1].split(" ")[0].split("\\")[0] );
	});
	
	return arr;
}