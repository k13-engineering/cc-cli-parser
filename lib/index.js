
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
            includeDirectories: [...(result.includeDirectories || []), includeDirectory]
        };
    };

    const addLibraryDirectory = ({ libraryDirectory }) => {
        if ((result.libraryDirectories || []).indexOf(libraryDirectory) >= 0) {
            return;
        }

        result = {
            ...result,
            libraryDirectories: [...(result.libraryDirectories || []), libraryDirectory]
        };
    };

    const addIncludeFile = ({ includeFile }) => {
        result = {
            ...result,
            includeFiles: [...(result.includeFiles || []), includeFile]
        };
    }

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

    const addDependencyInfoOptions = (obj) => {
        result = {
            ...result,
            dependencyInfo: {
                ...result.dependencyInfo,
                ...obj
            }
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
            } else if (nextArgBelongsTo === "-L") {
                addLibraryDirectory({ libraryDirectory: arg });
            } else if (nextArgBelongsTo === "-D") {
                addDefines(parseDefine(arg));
            } else if (nextArgBelongsTo === "-include") {
                addIncludeFile({ includeFile: arg });
            } else if (nextArgBelongsTo === "-MT") {
                addDependencyInfoOptions({
                    target: arg
                });
            } else if (nextArgBelongsTo === "-MF") {
                addDependencyInfoOptions({
                    file: true,
                    filename: arg
                });
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
                    nextArgBelongsTo = arg;
                    return;
                }

                addIncludeDirectory({ includeDirectory: arg.substr("-I".length) });
            } else if (arg.startsWith("-L")) {
                if (arg === "-L") {
                    nextArgBelongsTo = arg;
                    return;
                }

                addLibraryDirectory({ libraryDirectory: arg.substr("-L".length) });
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
            } else if (arg.startsWith("-M")) {

                if (arg === "-M" || arg === "-MM") {
                    addDependencyInfoOptions({
                        generate: true,
                        includeSystemHeaderFiles: arg === "-M"
                    });

                    // "-M" and "-MM" imply "-E"
                    result = {
                        ...result,
                        action: "preprocess"
                    };
                } else if (arg === "-MD" || arg === "-MMD") {
                    addDependencyInfoOptions({
                        generate: true,
                        includeSystemHeaderFiles: arg === "-MD",
                        file: true
                    });
                } else if (arg === "-MT" || arg === "-MF") {
                    nextArgBelongsTo = arg;
                    return;
                } else if (arg === "-MP") {
                    addDependencyInfoOptions({
                        includeMissing: true
                    });
                } else {
                    throw Error(`ùnknown option ${arg}`);
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
            } else if (arg === "-include") {
                nextArgBelongsTo = "-include";
                return;
            } else {
                throw Error(`unknown option ${arg}`);
            }
        } else {
            result = {
                ...result,
                inputFiles: [...(result.inputFiles || []), arg]
            };
        }
    });

    return result;
};

const formatOptimizationOptions = ({ optimization }) => {
    return [
        ...(optimization?.enable) ? ["-O"] : [],
        ...(optimization?.level !== undefined) ? [`-O${optimization.level}`] : [],
        ...(optimization?.size) ? ["-Os"] : [],
    ];
};

const formatDebugOptions = ({ debug }) => {
    return [
        ...(debug?.enable) ? ["-g"] : [],
        ...(debug?.level !== undefined) ? [`-g${options.debug.level}`] : [],
    ];
};

const formatIncludeDirectoryOptions = ({ includeDirectories }) => {
    return (includeDirectories || []).map((dir) => `-I${dir}`);
};

const formatIncludeFileOptions = ({ includeFiles }) => {
    let options = [];

    (includeFiles || []).forEach((includeFile) => {
        options = [
            ...options,
            "-include",
            includeFile
        ];
    });

    return options;
};

const formatLibraryDirectoryOptions = ({ libraryDirectories }) => {
    return (libraryDirectories || []).map((dir) => `-L${dir}`);
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

const formatDependencyInfoOptions = ({ action, dependencyInfo }) => {
    if (!dependencyInfo) {
        return [];
    }

    let options = [];

    if (dependencyInfo.generate) {
        if (dependencyInfo.file) {
            options = [...options, dependencyInfo.includeSystemHeaderFiles ? "-MD" : "-MMD"];
        } else {
            if (action !== "preprocess") {
                throw Error("action is preprocess but non-file dependency info requested");
            }
            options = [...options, dependencyInfo.includeSystemHeaderFiles ? "-M" : "-MM"];
        }
    }

    if (dependencyInfo.target !== undefined) {
        options = [...options, "-MT", dependencyInfo.target];
    }

    if (dependencyInfo.filename !== undefined) {
        if (!dependencyInfo.file) {
            throw Error("filename given but file output not enabled");
        }

        options = [...options, "-MF", dependencyInfo.filename];
    }

    if (dependencyInfo.includeMissing) {
        options = [...options, "-MP"];
    }

    return options;
};

const format = ({ options }) => {
    const debugOptions = formatDebugOptions({ debug: options.debug });
    const optimizationOptions = formatOptimizationOptions({ optimization: options.optimization });
    const includeDirectoryOptions = formatIncludeDirectoryOptions({ includeDirectories: options.includeDirectories });
    const includeFileOptions = formatIncludeFileOptions({ includeFiles: options.includeFiles });
    const libraryDirectoryOptions = formatLibraryDirectoryOptions({ libraryDirectories: options.libraryDirectories });
    const defineOptions = formatDefineOptions({ defines: options.defines });
    const codeGenerationOptions = formatCodeGenerationOptions({ codeGeneration: options.codeGeneration });
    const warnOptions = formatWarnOptions({ warn: options.warn });
    const libraryOptions = formatLibraryOptions({ libraries: options.libraries });
    const dependencyInfoOptions = formatDependencyInfoOptions({ action: options.action, dependencyInfo: options.dependencyInfo });

    return [
        ...{
            "link": [],
            "compile": ["-c"],
            "preprocess": ["-E"]
        }[options.action] || [],

        ...(options.target ? [`--target=${options.target}`] : []),

        ...(options.inputFiles || []),

        ...(options.pthread ? ["-pthread"] : []),

        ...(options.nodefaultlibs ? ["-nodefaultlibs"] : []),
        ...(options.nostartfiles ? ["-nostartfiles"] : []),
        ...(options.nostdinc ? ["-nostdinc"] : []),
        ...(options.nolibc ? ["-nolibc"] : []),

        ...(options.rdynamic ? ["-rdynamic"] : []),

        ...(options.std ? [`-std=${options.std}`] : []),

        ...optimizationOptions,
        ...debugOptions,
        ...includeDirectoryOptions,
        ...includeFileOptions,
        ...libraryDirectoryOptions,
        ...defineOptions,
        ...codeGenerationOptions,
        ...warnOptions,
        ...libraryOptions,
        ...dependencyInfoOptions,

        ...(
            options.outputFile ? ["-o", options.outputFile] : []
        )
    ];
};

export default {
    parse,
    format
};
