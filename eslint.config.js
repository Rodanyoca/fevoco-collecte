import js from '@eslint/js';
import globals from 'globals';
export default [{ignores:['dist/**','node_modules/**','output/**','test-results/**','playwright-report/**']},js.configs.recommended,{files:['**/*.js','**/*.mjs'],languageOptions:{ecmaVersion:'latest',sourceType:'module',globals:{...globals.browser,...globals.node,...globals.serviceworker,__ASSETS__:'readonly'}},rules:{'no-unused-vars':['error',{argsIgnorePattern:'^_',caughtErrorsIgnorePattern:'^_'}]}}];
