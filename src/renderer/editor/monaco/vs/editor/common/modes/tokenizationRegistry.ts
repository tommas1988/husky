/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { IDisposable, toDisposable } from '../../../base/common/lifecycle';
import { Event, Emitter } from '../../../base/common/event';
import { ColorId, ITokenizationRegistry, ITokenizationSupport, ITokenizationSupportChangedEvent } from '../modes';
import { Color } from '../../../base/common/color';

export class TokenizationRegistryImpl implements ITokenizationRegistry {

	private _map: { [language: string]: ITokenizationSupport };

	private readonly _onDidChange: Emitter<ITokenizationSupportChangedEvent> = new Emitter<ITokenizationSupportChangedEvent>();
	public readonly onDidChange: Event<ITokenizationSupportChangedEvent> = this._onDidChange.event;

	private _colorMap: Color[];

	constructor() {
		this._map = Object.create(null);
		this._colorMap = null;
	}

	public fire(languages: string[]): void {
		this._onDidChange.fire({
			changedLanguages: languages,
			changedColorMap: false
		});
	}

	public register(language: string, support: ITokenizationSupport): IDisposable {
		this._map[language] = support;
		this.fire([language]);
		return toDisposable(() => {
			if (this._map[language] !== support) {
				return;
			}
			delete this._map[language];
			this.fire([language]);
		});
	}

	public get(language: string): ITokenizationSupport {
		return (this._map[language] || null);
	}

	public setColorMap(colorMap: Color[]): void {
		this._colorMap = colorMap;
		this._onDidChange.fire({
			changedLanguages: Object.keys(this._map),
			changedColorMap: true
		});
	}

	public getColorMap(): Color[] {
		return this._colorMap;
	}

	public getDefaultBackground(): Color {
		return this._colorMap[ColorId.DefaultBackground];
	}
}
