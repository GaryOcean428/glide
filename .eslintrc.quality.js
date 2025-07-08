module.exports = {
    extends: ['eslint:recommended'],
    env: {
        node: true,
        es6: true
    },
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
    },
    rules: {
        'no-console': 'warn',
        'no-unused-vars': 'error',
        'no-undef': 'error',
        'prefer-const': 'error',
        'no-var': 'error',
        'semi': ['error', 'always'],
        'quotes': ['error', 'single'],
        'indent': ['error', 4],
        'no-trailing-spaces': 'error',
        'eol-last': 'error',
        'comma-dangle': ['error', 'never'],
        'no-empty': 'error',
        'no-empty-function': 'warn',
        'consistent-return': 'error',
        'no-implicit-globals': 'error',
        'no-eval': 'error',
        'no-implied-eval': 'error'
    }
};