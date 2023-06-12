
const simpleFlags = {
    "-nostdinc": {
        nostdinc: true
    },
    "-nostartfiles": {
        nostartfiles: true
    },
    "-nodefaultlibs": {
        nodefaultlibs: true
    },
    "-nolibc": {
        nolibc: true
    },
    "-static": {
        static: true
    },
    "-pthread": {
        pthread: true
    },
    "-c": {
        action: "compile"
    },
    "-E": {
        action: "preprocess"
    },
    "-rdynamic": {
        rdynamic: true
    }
};

const parse = ({ args }) => {
    let result = {
        action: "link",
    };

    let nextArgBelongsTo = undefined;

    const addValues = (values) => {
        result = {
            ...result,
            ...values
        };
    };

    const addIncludeDirectory = ({ includeDirectory }) => {
        if ((result.includeDirectories || []).indexOf(includeDirectory) >= 0) {
            return;
        }

        result = {
            ...result,
            includeDirectories: [ ...(result.includeDirectories || []), includeDirectory ]
        };
    };

    const addDebugOption = (option) => {
        result = {
            ...result,
            debug: {
                ...result.debug,
                ...option
            }
        };
    };

    const addWarnOption = (option) => {
        result = {
            ...result,
            warn: {
                ...result.warn,
                ...option
            }
        }
    };

    const addDefines = (defines) => {
        result = {
            ...result,
            defines: {
                ...result.defines,
                ...defines
            }
        };
    };

    const addCodeGeneration = (obj) => {
        result = {
            ...result,
            codeGeneration: {
                ...result.codeGeneration,
                ...obj
            }
        };
    };

    const addLibrary = ({ name }) => {
        result = {
            ...result,
            libraries: [
                ...(result.libraries || []),
                name
            ]
        };
    };

    const parseCodeGeneration = (arg) => {
        const parts = arg.split("=");
        if (parts.length === 1) {
            return {
                [arg]: true
            };
        } else if (parts.length > 2) {
            throw Error(`invalid -f option with multiple equals: "${arg}"`);
        } else {
            return {
                [parts[0]]: parts[1]
            };
        }
    };

    const parseDefine = (define) => {
        const parts = define.split("=");
        if (parts.length === 1) {
            return {
                [define]: true
            };
        } else if (parts.length > 2) {
            throw Error(`invalid define with multiple equals: "${define}"`);
        } else {
            return {
                [parts[0]]: parts[1]
            };
        }
    };

    args.forEach((arg) => {
        if (nextArgBelongsTo !== undefined) {
            if (nextArgBelongsTo === "-o") {
                addValues({ outputFile: arg });
            } else if (nextArgBelongsTo === "-I") {
                addIncludeDirectory({ includeDirectory: arg });
            } else if (nextArgBelongsTo === "-D") {
                addDefines(parseDefine(arg));
            } else {
                throw Error(`unhandled option parameter`);
            }

            nextArgBelongsTo = undefined;
            return;
        }

        if (simpleFlags[arg]) {
            result = {
                ...result,
                ...simpleFlags[arg]
            };
        } else if (arg.startsWith("-")) {
            if (arg.startsWith("-f")) {
                let prefix = "-f";
                let value = true;
    
                if (arg.startsWith("-fno-")) {
                    prefix = "-fno-";
                    value = false;
                }

                addCodeGeneration(parseCodeGeneration(arg.substr(prefix.length)));
            } else if (arg === "-o") {
                nextArgBelongsTo = arg;
                return;
            } else if (arg.startsWith("-I")) {
                if (arg === "-I") {
                    nextArgBelongsTo = "-I";
                    return;
                }

                addIncludeDirectory({ includeDirectory: arg.substr("-I".length) });
            } else if (arg.startsWith("-g")) {
                if (arg === "-g") {
                    addDebugOption({ enable: true });
                    return;
                }

                if (arg.startsWith("-gno-")) {
                    const key = arg.substr("-gno-".length);

                    addDebugOption({
                        [key]: false
                    });

                    return;
                }

                const value = arg.substr("-g".length);
                const valueAsNumber = parseInt(value, 10);
                if (!isNaN(valueAsNumber)) {
                    addDebugOption({
                        level: valueAsNumber
                    });
                    return;
                }

                addDebugOption({
                    [value]: true
                });
            } else if (arg.startsWith("-O")) {
                const value = arg.substr("-O".length);

                if (value === "") {
                    addValues({
                        optimization: {
                            enable: true
                        }
                    });
                } else {
                    const valueAsNumber = parseInt(value, 10);
                    if (!isNaN(valueAsNumber)) {
                        addValues({
                            optimization: {
                                level: valueAsNumber
                            }
                        });
                        return;
                    }

                    if (value === "s") {
                        addValues({
                            optimization: {
                                size: true
                            }
                        });
                    } else {
                        addValues({
                            optimization: {
                                [value]: true
                            }
                        });
                    }
                }
            } else if (arg.startsWith("-Q")) {
                // ignore for now
            } else if (arg.startsWith("-D")) {
                if (arg === "-D") {
                    nextArgBelongsTo = "-D";
                    return;
                }

                const value = arg.substr("-D".length);
                addDefines(parseDefine(value));
            } else if (arg.startsWith("-W")) {
                if (arg === "-W") {
                    throw Error("-W with arg not supported yet");
                }

                if (arg.startsWith("-Wno-")) {
                    const key = arg.substr("-Wno-".length);

                    addWarnOption({
                        [key]: false
                    });
                } else {
                    const key = arg.substr("-W".length);

                    addWarnOption({
                        [key]: true
                    });
                }
            } else if (arg.startsWith("-std=")) {
                const stdToUse = arg.substr("-std=".length);
                if (stdToUse.length === 0) {
                    throw Error(`empty std given`);
                }

                addValues({
                    std: stdToUse
                });
            } else if (arg.startsWith("-l")) {
                const libraryName = arg.substr("-l".length);
                if (libraryName.length === 0) {
                    throw Error(`library name must be given`);
                }

                addLibrary({ name: libraryName });
            } else {
                throw Error(`unknown option ${arg}`);
            }
        } else {
            result = {
                ...result,
                inputFiles: [ ...(result.inputFiles || []), arg ]
            };
        }
    });

    return result;
};

const formatOptimizationOptions = ({ optimization }) => {
    return [
        ...(optimization?.enable) ? [ "-O" ] : [],
        ...(optimization?.level !== undefined) ? [ `-O${optimization.level}` ] : [],
        ...(optimization?.size) ? [ "-Os" ] : [],
    ];
};

const formatDebugOptions = ({ debug }) => {
    return [
        ...(debug?.enable) ? [ "-g" ] : [],
        ...(debug?.level !== undefined) ? [ `-g${options.debug.level}` ] : [],
    ];
};

const formatIncludeDirectoryOptions = ({ includeDirectories }) => {
    return (includeDirectories || []).map((dir) => `-I${dir}`);
};

const formatDefineOptions = ({ defines }) => {
    return Object.keys(defines || {}).map((key) => {
        if (defines[key] === true) {
            return `-D${key}`;
        } else {
            return `-D${key}=${defines[key]}`;
        }
    });
};

const formatCodeGenerationOptions = ({ codeGeneration }) => {
    return Object.keys(codeGeneration || {}).map((key) => {
        const value = codeGeneration[key];

        if (value === true) {
            return `-f${key}`;
        } else if (value === false) {
            return `-fno-${key}`;
        } else {
            return `-f${key}=${value}`;
        }
    });
};

const formatWarnOptions = ({ warn }) => {
    return Object.keys(warn || {}).map((key) => {
        const value = warn[key];

        if (value === true) {
            return `-W${key}`;
        } else if (value === false) {
            return `-Wno-${key}`;
        } else {
            throw Error(`unsupported value ${value}`);
        }
    });
};

const formatLibraryOptions = ({ libraries }) => {
    return (libraries || []).map((name) => {
        return `-l${name}`;
    });
};

const format = ({ options }) => {
    const debugOptions = formatDebugOptions({ debug: options.debug });
    const optimizationOptions = formatOptimizationOptions({ optimization: options.optimization });
    const includeDirectoryOptions = formatIncludeDirectoryOptions({ includeDirectories: options.includeDirectories });
    const defineOptions = formatDefineOptions({ defines: options.defines });
    const codeGenerationOptions = formatCodeGenerationOptions({ codeGeneration: options.codeGeneration });
    const warnOptions = formatWarnOptions({ warn: options.warn });
    const libraryOptions = formatLibraryOptions({ libraries: options.libraries });

    return [
        ...{
            "link": [],
            "compile": [ "-c" ],
            "preprocess": [ "-E" ]
        }[options.action] || [],

        ...(options.target ? [ `--target=${options.target}` ] : []),

        ...(options.inputFiles || []),

        ...(options.pthread ? [ "-pthread" ] : []),

        ...(options.nodefaultlibs ? [ "-nodefaultlibs" ] : []),
        ...(options.nostartfiles ? [ "-nostartfiles" ] : []),
        ...(options.nostdinc ? [ "-nostdinc" ] : []),
        ...(options.nolibc ? [ "-nolibc" ] : []),

        ...(options.rdynamic ? [ "-rdynamic" ] : []),

        ...(options.std ? [ `-std=${options.std}` ] : []),

        ...optimizationOptions,
        ...debugOptions,
        ...includeDirectoryOptions,
        ...defineOptions,
        ...codeGenerationOptions,
        ...warnOptions,
        ...libraryOptions,

        ...(
            options.outputFile ? [ "-o", options.outputFile ] : []
        )
    ];
};

export default {
    parse,
    format
};
