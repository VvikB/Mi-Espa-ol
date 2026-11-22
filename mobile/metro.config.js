const path=require('path');
const {getDefaultConfig}=require('expo/metro-config');
const root=__dirname;
const config=getDefaultConfig(root);
// Shared platform-independent learning code lives one directory above mobile.
config.watchFolders=[path.resolve(root,'..')];
config.resolver.nodeModulesPaths=[path.resolve(root,'node_modules')];
returnConfig=config;
module.exports=returnConfig;
