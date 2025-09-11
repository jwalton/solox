import eslint from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import tsEslint from 'typescript-eslint';

const TEST_OVERRIDES = {
    files: ['**/*.spec.*', '**/*.test.*', 'test/**/*'],
    rules: {
        // Allow things like `expect(foo).to.be.true;`.
        '@typescript-eslint/no-unused-expressions': 'off',
    },
};

const IMPORT_PLUGIN = {
    plugins: {
        import: importPlugin,
    },
    rules: {
        'import/extensions': ['error', 'ignorePackages'],
    },
};

export default [
    eslint.configs.recommended,
    ...tsEslint.configs.recommended,
    IMPORT_PLUGIN,
    TEST_OVERRIDES,
];

function typescript(tsconfigRootDir, extras, tsConfigFiles) {
    return [
        {
            languageOptions: {
                parserOptions: {
                    project: tsConfigFiles,
                    tsconfigRootDir,
                },
            },
        },
        eslint.configs.recommended,
        ...tsEslint.configs.recommendedTypeChecked,
        ...extras,
        TEST_OVERRIDES,
    ];
}

export function typescriptCjs(tsconfigRootDir, options = {}) {
    return typescript(tsconfigRootDir, [], options?.tsConfigFiles || true);
}

export function typescriptEsm(tsconfigRootDir, options = {}) {
    return typescript(tsconfigRootDir, [IMPORT_PLUGIN], options?.tsConfigFiles || true);
}
