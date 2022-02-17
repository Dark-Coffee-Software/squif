# Squif
[![Installs - 335](https://img.shields.io/static/v1?label=Installs&message=335&color=%238300e9)](https://marketplace.visualstudio.com/items?itemName=DarkCoffeeSoftware.squif) [![version - 0.0.3](https://img.shields.io/static/v1?label=version&message=0.0.3&color=%230c71c3)](https://marketplace.visualstudio.com/items?itemName=DarkCoffeeSoftware.squif)  
An Arma 3 VS Code extension tool
  
  
# Usage
- Install the package via VS Code Extensions, or download the package from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=DarkCoffeeSoftware.squif)
- Create a `squif.jsonc` file in your project directory
- Add in your desired import packages like below:  
```json
{
    "projects": [
        "ace_framework",        
        "saef_toolbox"
    ]
}
```
- A full list of available packages and documenation can be found [here](https://squif.co.za/docs)
- Open then command pallete, and run `squif init`
- You will get a notification once all functions have been imported.
- The more packages you load, the longer it may take to import
