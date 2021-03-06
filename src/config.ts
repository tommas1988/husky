import { EventEmitter } from 'events';
import { remote, app, ipcMain, ipcRenderer } from 'electron';
import { sep } from 'path';
import { env } from 'process';
import { readJsonSync } from 'fs-extra';
import { writeJson } from 'fs-promise';
import { isMainProcess, checkMainProcess } from './utils';
import ServiceLocator from './service-locator';
import { inspect } from 'util';

abstract class BaseConfig extends EventEmitter {
    protected _configs;

    constructor() {
        super();
    }

    abstract save(name: string, newVal: any, oldVal: any);

    protected _getConfig(name: string, defaults: any = '') {
        return this._configs[name] || defaults;
    }

    protected _setConfig(name: string, newVal: any, compare?: (oldVal: any, newVal: any) => number) {
        let oldVal = this._configs[name];

        if (compare) {
            if (!compare(oldVal, newVal)) {
                return;
            }
        } else if (oldVal === newVal) {
            return;
        }

        this._configs[name] = newVal;
        this.save(name, newVal, oldVal);
    }
}

class SubConfig extends BaseConfig {
    protected _parent: BaseConfig;
    protected _nodeName: string;

    constructor(parent: BaseConfig, configs) {
        super();
        this._configs = configs;
        this._parent = parent;
    }

    save(name: string, newVal: any, oldVal: any) {
        this._parent.save(`${this._nodeName}.${name}`, newVal, oldVal);
    }
}

export class EditorConfig extends SubConfig {
    constructor(parent, configs) {
        super(parent, configs);
        this._nodeName = 'editor';
    }

    get keybinding() {
        return  this._getConfig('keybinding', 'default');
    }

    set keybinding(val: string) {
        this._setConfig('keybinding', val);
    }
}

interface IGitRemoteAuth {
    type: 'ssh' | 'password',
    
    publicKey?: string,
    privateKey?: string,

    username?: string,
    password?: string,
}

export class GitConfig extends SubConfig {
    constructor(parent, configs) {
        super(parent, configs);
        this._nodeName = 'git';
    }

    get username(): string {
        return this._getConfig('username');
    }

    set username(name: string) {
        this._setConfig('username', name);
    }

    get userEmail(): string {
        return this._getConfig('userEmail');
    }

    set userEmail(email: string) {
        this._setConfig('userEmail', email);
    }

    get remote(): string {
        return this._getConfig('remote');
    }

    set remote(url: string) {
        this._setConfig('remote', url);
    }

    get remoteAuth(): IGitRemoteAuth {
        return this._getConfig('remote-auth', null);
    }

    set remoteAuth(auth: IGitRemoteAuth) {
        this._setConfig('remote-auth', auth, (oldVal: IGitRemoteAuth, newVal: IGitRemoteAuth): number => {
            if (!oldVal) {
                return 1;
            }

            if (oldVal.type === newVal.type) {
                if (oldVal.type === 'ssh') {
                    if (oldVal.publicKey !== newVal.publicKey || oldVal.privateKey !== newVal.privateKey) {
                        return 1;
                    }
                } else {
                    if (oldVal.username !== newVal.username || oldVal.password !== newVal.password) {
                        return 1;
                    }
                }
            }
            return 0;
        });
    }
}

const IpcEvent = {
    sync: 'config:sync',
};

export const Event = {
    change: 'config:config-change',
    change_failed: 'config:config-change-failed',
};


export class Config extends BaseConfig {
    private _filename: string;

    private _editor: EditorConfig;
    private _git: GitConfig;

    get editor(): EditorConfig {
        return this._editor;
    }

    get git(): GitConfig {
        return this._git;
    }

    get noteDir(): string {
        return this._getConfig('noteDir');
    }

    set noteDir(dirname: string) {
        this._setConfig('noteDir', dirname);
    }

    get debug(): boolean {
        return this._getConfig('debug', false);
    }

    set debug(val: boolean) {
        this._setConfig('debug', val);
    }

    constructor() {
        super();

        let pathName: 'temp' | 'home' = env.test ? 'temp' : 'home';
        this._filename = `${isMainProcess ? app.getPath(pathName) : remote.app.getPath(pathName)}${sep}.husky-note.json`;

        let configs;
        try {
            configs = readJsonSync(this._filename);
        } catch (e) {
            configs = {};
        }

        this._setConfigs(configs);

        if (isMainProcess) {
            ipcMain.on(IpcEvent.sync, (event, configs, name, newVal, oldVal) => {
                this.update(configs, name, newVal, oldVal);
            });
        }
    }

    /**
     * Could only be called in main process
     */
    update(configs, name: string, newVal: any, oldVal: any) {
        checkMainProcess();

        ServiceLocator.logger.info('sync config changes: %s', inspect(configs));

        this._setConfigs(configs);
        this.emit(Event.change, name, newVal, oldVal);
    }

    private _setConfigs(configs) {
        configs.editor = configs.editor || {};
        this._editor = new EditorConfig(this, configs.editor);

        configs.git = configs.git || {};
        this._git = new GitConfig(this, configs.git);

        this._configs = configs;
    }

    save(name: string, newVal: any, oldVal: any) {
        writeJson(this._filename, this._configs).then(() => {
            ipcRenderer.send(IpcEvent.sync, this._configs, name, newVal, oldVal);
            this.emit(Event.change, name, newVal, oldVal);
        }).catch(() => {
            this.emit(Event.change_failed, name);
            let parts = name.split('.');
            let config = this._configs;

            // restore to old value
            while (parts.length > 1) {
                config = config[parts.shift()];
            }
            config[parts[0]] = oldVal;
        });
    }
}