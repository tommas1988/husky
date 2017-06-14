import { Editor } from './editor';
import { NoteManager } from './note-manager';
import { NoteRenderer } from './note-renderer';
import { Alerter } from './alerter';
import { Config } from './config';
import { Dialog } from './dialog';
import { Git } from './git';
import { checkRendererProcess, checkMainProcess } from './utils';

let config: Config;
let editor: Editor;
let noteManager: NoteManager;
let noteRenderer: NoteRenderer;
let alerter: Alerter;
let dialog: Dialog;
let git: Git;

const ServiceLocator = {
    get config(): Config {
        if (!config) {
            config = new Config();
        }
        return config;
    },

    get editor(): Editor {
        checkRendererProcess();

        if (!editor) {
            let Editor = require('./editor').Editor;
            editor = new Editor();
        }
        return editor;
    },

    get noteManager(): NoteManager {
        if (!noteManager) {
            noteManager = new NoteManager();
        }
        return noteManager;
    },

    get noteRenderer(): NoteRenderer {
        checkRendererProcess();

        if (!noteRenderer) {
            let NoteRenderer = require('./note-renderer').NoteRenderer;
            noteRenderer = new NoteRenderer();
        }
        return noteRenderer;
    },

    get alerter(): Alerter {
        checkRendererProcess();

        if (!alerter) {
            let Alerter = require('./alerter').Alerter;
            alerter = new Alerter();
        }
        return alerter;
    },

    get dialog(): Dialog {
        if (!dialog) {
            dialog = new Dialog();
        }
        return dialog;
    },

    get git(): Git {
        checkMainProcess();

        if (!git) {
            if (!this.config.noteDir) {
                throw new Error('Cannot initialize Git without note directory setted!');
            }

            let Git = require('./git').Git;
            git = new Git(this.config.noteDir, this.config.git);
        }
        return git;
    },
};

export default ServiceLocator;